// Responsibility: Weight-profile resolution and tuning for the scoring engine —
//   resolve the active weights for (college, profile) via the override chain
//   [college row → system-default row → built-in profile], and save new
//   versions with validation + audit (M11).
// Layer: Intelligence (Layer 1) service.
// Depends on: scoringConfig.repository (new table), scoring/profiles (pure).
// Must never be depended on by: legacy modules. The Decision layer reaches this
//   only through intelligence.service re-exports.

const repo = require("./scoringConfig.repository");
const { PROFILES, validateWeights, builtinWeights } = require("./scoring/profiles");

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const assertKnownProfile = (profile) => {
  if (!PROFILES.includes(profile)) {
    throw createHttpError(400, `profile must be one of: ${PROFILES.join(", ")}`);
  }
};

// Postgres "undefined_table" — the scoring_config migration has not been
// applied yet. Weight resolution must DEGRADE to built-ins in that case, so a
// pre-existing feature (the live camp-selection board) can never break on an
// un-migrated database. Any other DB error still surfaces normally.
const isMissingTable = (err) => err?.code === "42P01";

/**
 * Resolve the weights that should govern (collegeId, profile).
 * Chain: active college override → active system default row → built-in profile.
 * Stored rows are validated/normalised on the way out; a corrupt row falls
 * through to the next source rather than poisoning the pipeline.
 *
 * @returns {{profile:string, weights:object, source:('college'|'default'|'builtin'),
 *            version:(number|null)}}
 */
async function resolveWeights(collegeId, profile = "general") {
  assertKnownProfile(profile);

  try {
    if (collegeId != null) {
      const collegeRow = await repo.getActiveForCollege(collegeId, profile);
      if (collegeRow) {
        const check = validateWeights(collegeRow.weights);
        if (check.ok) {
          return { profile, weights: check.normalized, source: "college", version: collegeRow.version };
        }
      }
    }

    const defaultRow = await repo.getActiveDefault(profile);
    if (defaultRow) {
      const check = validateWeights(defaultRow.weights);
      if (check.ok) {
        return { profile, weights: check.normalized, source: "default", version: defaultRow.version };
      }
    }
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }

  return { profile, weights: builtinWeights(profile), source: "builtin", version: null };
}

/**
 * Save a new weight version for the caller's college (validated, versioned, audited).
 * @returns the saved config row + the normalised weights now in force.
 */
async function saveWeights({ collegeId, profile = "general", weights, userId }) {
  assertKnownProfile(profile);
  if (collegeId == null) throw createHttpError(400, "College context is required.");

  const check = validateWeights(weights);
  if (!check.ok) {
    throw createHttpError(400, `Invalid weights: ${check.errors.join("; ")}`);
  }

  const row = await repo.insertVersion({
    collegeId,
    profile,
    weights: check.normalized,
    updatedBy: userId ?? null,
  });

  return { saved: row, resolved: { profile, weights: check.normalized, source: "college", version: row.version } };
}

/** Version history (college rows) + the currently-resolved weights, for the config UI. */
async function getConfigView(collegeId, profile = "general") {
  assertKnownProfile(profile);
  const resolved = await resolveWeights(collegeId, profile);
  let history = [];
  if (collegeId != null) {
    try {
      history = await repo.listVersions(collegeId, profile);
    } catch (err) {
      if (!isMissingTable(err)) throw err; // un-migrated DB → empty history, not a 500
    }
  }
  return { resolved, history, builtin: builtinWeights(profile) };
}

module.exports = { resolveWeights, saveWeights, getConfigView };
