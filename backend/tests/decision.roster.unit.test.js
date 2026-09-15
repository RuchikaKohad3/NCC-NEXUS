// Responsibility: Golden unit tests for roster-row shaping (M8.2b) —
//   buildRosterRows flattens a live selection into immutable audit rows.
// Layer: Decision Support (Layer 2) test — pure function only, no DB.
// Depends on: modules/decision/decision.service (pure export only) and the
//   campSelection recipe (to keep the two shapes in lock-step).
// Must never be depended on by: anything (test file).

const { buildRosterRows } = require("../src/modules/decision/decision.service");
const { selectForCamp } = require("../src/modules/decision/recipes/campSelection");

const cadet = (reg, name, score, confidence = 1, pillars = null) => ({
  regimental_no: reg,
  full_name: name,
  rank_name: "Cadet",
  has_snapshot: score != null,
  overall_score: score,
  overall_confidence: score != null ? confidence : null,
  pillars,
});

describe("buildRosterRows", () => {
  const cohort = [
    cadet("R1", "Alpha", 92),
    cadet("R2", "Bravo", 85),
    cadet("R3", "Charlie", 70),
    cadet("R4", "Delta", 55),
    cadet("R5", "Echo", null), // unranked — no snapshot
  ];

  test("flattens every tier and preserves counts", () => {
    const selection = selectForCamp(cohort, { slots: 2, reserves: 1, profile: "rdc" });
    const rows = buildRosterRows(selection);

    expect(rows).toHaveLength(5);
    expect(rows.filter((r) => r.tier === "selected")).toHaveLength(2);
    expect(rows.filter((r) => r.tier === "standby")).toHaveLength(1);
    expect(rows.filter((r) => r.tier === "not_selected")).toHaveLength(1);
    expect(rows.filter((r) => r.tier === "unranked")).toHaveLength(1);
  });

  test("denormalises identity and keeps rank/score/reasons on every row", () => {
    const selection = selectForCamp(cohort, { slots: 1, reserves: 0, profile: "rdc" });
    const top = buildRosterRows(selection).find((r) => r.tier === "selected");

    expect(top.regimental_no).toBe("R1");
    expect(top.full_name).toBe("Alpha");
    expect(top.rank_position).toBe(1);
    expect(top.overall_score).toBe(92);
    expect(Array.isArray(top.reasons)).toBe(true);
    expect(top.reasons.length).toBeGreaterThan(0);
  });

  test("unranked rows carry null rank_position, not 0", () => {
    const selection = selectForCamp(cohort, { slots: 2, reserves: 0 });
    const unranked = buildRosterRows(selection).find((r) => r.tier === "unranked");
    expect(unranked.regimental_no).toBe("R5");
    expect(unranked.rank_position).toBeNull();
  });

  test("row set is deterministic across repeated runs (audit stability)", () => {
    const a = buildRosterRows(selectForCamp(cohort, { slots: 2, reserves: 1 }));
    const b = buildRosterRows(selectForCamp(cohort, { slots: 2, reserves: 1 }));
    expect(a).toEqual(b);
  });

  test("empty selection yields an empty row set", () => {
    const selection = selectForCamp([], { slots: 3 });
    expect(buildRosterRows(selection)).toEqual([]);
  });
});
