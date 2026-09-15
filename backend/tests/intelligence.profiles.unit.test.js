// Responsibility: Golden unit tests for weight-profile validation/normalisation
//   and the built-in decision profiles (M11).
// Layer: Intelligence (Layer 1) test — no DB, deterministic.
// Depends on: modules/intelligence/scoring/profiles.
// Must never be depended on by: anything (test file).

const {
  KNOWN_PILLARS,
  PROFILES,
  BUILTIN_PROFILES,
  validateWeights,
  builtinWeights,
} = require("../src/modules/intelligence/scoring/profiles");

const sumOf = (weights) => Object.values(weights).reduce((a, b) => a + b, 0);

describe("profiles: built-ins", () => {
  test("all four decision profiles exist and are known", () => {
    expect(PROFILES.sort()).toEqual(["certificate", "general", "promotion", "rdc"]);
    for (const p of PROFILES) expect(BUILTIN_PROFILES[p]).toBeDefined();
  });

  test("every built-in profile sums to ~1 over known pillars", () => {
    for (const [name, weights] of Object.entries(BUILTIN_PROFILES)) {
      const sum = sumOf(weights);
      expect(Math.abs(sum - 1)).toBeLessThan(0.01);
      for (const key of Object.keys(weights)) {
        expect(KNOWN_PILLARS).toContain(key);
      }
      expect(name).toBeTruthy();
    }
  });

  test("general matches the aggregator's GENERAL_PROFILE exactly (zero drift)", () => {
    const { GENERAL_PROFILE } = require("../src/modules/intelligence/scoring/aggregate");
    expect(BUILTIN_PROFILES.general).toEqual(GENERAL_PROFILE);
  });

  test("builtinWeights returns a copy, not the shared object", () => {
    const a = builtinWeights("rdc");
    a.attendance = 99;
    expect(BUILTIN_PROFILES.rdc.attendance).not.toBe(99);
  });

  test("builtinWeights is null for an unknown profile", () => {
    expect(builtinWeights("nope")).toBeNull();
  });
});

describe("validateWeights", () => {
  test("accepts fractions summing to ~1 and normalises", () => {
    const r = validateWeights({ attendance: 0.5, knowledge: 0.5 });
    expect(r.ok).toBe(true);
    expect(r.normalized).toEqual({ attendance: 0.5, knowledge: 0.5 });
  });

  test("accepts percentages summing to ~100 and normalises to fractions", () => {
    const r = validateWeights({ attendance: 60, knowledge: 40 });
    expect(r.ok).toBe(true);
    expect(r.normalized.attendance).toBeCloseTo(0.6, 4);
    expect(r.normalized.knowledge).toBeCloseTo(0.4, 4);
  });

  test("drops zero-weight pillars from the normalised output", () => {
    const r = validateWeights({ attendance: 1, knowledge: 0 });
    expect(r.ok).toBe(true);
    expect(r.normalized).toEqual({ attendance: 1 });
  });

  test("rejects unknown pillars by name", () => {
    const r = validateWeights({ attendance: 0.5, bravery: 0.5 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/bravery/);
  });

  test("rejects negative and non-numeric weights", () => {
    expect(validateWeights({ attendance: -1, knowledge: 2 }).ok).toBe(false);
    expect(validateWeights({ attendance: "lots" }).ok).toBe(false);
  });

  test("rejects sums that are neither ~1 nor ~100", () => {
    const r = validateWeights({ attendance: 0.5, knowledge: 0.2 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/sum/);
  });

  test("rejects empty / non-object input", () => {
    expect(validateWeights({}).ok).toBe(false);
    expect(validateWeights(null).ok).toBe(false);
    expect(validateWeights([0.5, 0.5]).ok).toBe(false);
  });

  test("accepts drill/communication keys (future pillars) without code change", () => {
    const r = validateWeights({ attendance: 0.5, drill: 0.3, communication: 0.2 });
    expect(r.ok).toBe(true);
  });
});
