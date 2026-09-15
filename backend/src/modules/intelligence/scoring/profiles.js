// Responsibility: Built-in default weight profiles for every decision profile
//   (general / rdc / promotion / certificate) + the canonical pillar list and
//   pure weight-validation/normalisation helpers used by the scoring-config flow.
// Layer: Intelligence (Layer 1) — pure data + pure functions, NO I/O, NO DB.
// Depends on: scoring/aggregate (GENERAL_PROFILE stays the single source for "general").
// Must never be depended on by: legacy modules. Decision layer consumes these only
//   through intelligence.service / scoringConfig.service.
//
// These are PROVISIONAL defaults (M11): a scoring_config row (college override or
// system default) always wins over what is written here — see
// scoringConfig.service.resolveWeights. Weights here are fractions; rows stored in
// scoring_config may use fractions (~1) or percentages (~100) and are normalised.

const { GENERAL_PROFILE } = require("./aggregate");

// Pillars that exist today + the two that join once their data exists (SDD:
// "drill & communication join a profile once their data exists"). Allowing the
// keys now means a future config row can include them without a code change.
const KNOWN_PILLARS = [
  "attendance",
  "discipline",
  "knowledge",
  "participation",
  "leadership",
  "drill",
  "communication",
];

const PROFILES = ["general", "rdc", "promotion", "certificate"];

// Provisional built-in defaults per decision profile. "general" is the exact
// GENERAL_PROFILE already used for stored snapshots — zero behaviour change.
const BUILTIN_PROFILES = {
  general: { ...GENERAL_PROFILE },
  // Camp/RDC readiness: turning up, conduct and engagement dominate.
  rdc: {
    attendance: 0.3,
    discipline: 0.25,
    participation: 0.2,
    leadership: 0.15,
    knowledge: 0.1,
  },
  // Promotion boards: leadership and conduct first.
  promotion: {
    leadership: 0.35,
    discipline: 0.25,
    attendance: 0.15,
    knowledge: 0.15,
    participation: 0.1,
  },
  // B/C-certificate style academic readiness: knowledge first.
  certificate: {
    knowledge: 0.35,
    attendance: 0.25,
    discipline: 0.2,
    participation: 0.1,
    leadership: 0.1,
  },
};

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Validate a raw weights object (from a config row or an API body).
 * Accepts fractions summing to ~1 or percentages summing to ~100.
 * @returns {{ok:boolean, errors:string[], normalized:(object|null)}}
 *   normalized = fractions summing to 1 (only when ok).
 */
function validateWeights(weights) {
  const errors = [];
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return { ok: false, errors: ["weights must be an object of pillar → number"], normalized: null };
  }

  const entries = Object.entries(weights);
  if (entries.length === 0) {
    return { ok: false, errors: ["weights must contain at least one pillar"], normalized: null };
  }

  let sum = 0;
  for (const [key, value] of entries) {
    if (!KNOWN_PILLARS.includes(key)) {
      errors.push(`unknown pillar "${key}" (allowed: ${KNOWN_PILLARS.join(", ")})`);
      continue;
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      errors.push(`pillar "${key}" must be a number >= 0`);
      continue;
    }
    sum += num;
  }

  if (errors.length) return { ok: false, errors, normalized: null };
  if (sum <= 0) {
    return { ok: false, errors: ["weights must sum to a positive value"], normalized: null };
  }

  // Fractions (sum ≈ 1) or percentages (sum ≈ 100); anything else is a typo.
  const isFraction = sum > 0.99 && sum < 1.01;
  const isPercent = sum > 99 && sum < 101;
  if (!isFraction && !isPercent) {
    return {
      ok: false,
      errors: [`weights must sum to ~1 (fractions) or ~100 (percent); got ${round4(sum)}`],
      normalized: null,
    };
  }

  const normalized = {};
  for (const [key, value] of entries) {
    const num = Number(value);
    if (num > 0) normalized[key] = round4(num / sum);
  }
  return { ok: true, errors: [], normalized };
}

/** Built-in default (normalised fractions) for a profile; null for unknown profile. */
function builtinWeights(profile) {
  const base = BUILTIN_PROFILES[profile];
  return base ? { ...base } : null;
}

module.exports = {
  KNOWN_PILLARS,
  PROFILES,
  BUILTIN_PROFILES,
  validateWeights,
  builtinWeights,
};
