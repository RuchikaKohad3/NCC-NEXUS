// Responsibility: Read/write access for the NEW `scoring_config` table — active
//   weight lookup (college override / system default) and append-only versioning.
// Layer: Intelligence (Layer 1) — data access for the NEW table only.
// Depends on: db/knex and the new `scoring_config` table (M0 migration).
// Must never be depended on by: any existing/legacy module.
// NOTE: This file MAY INSERT/UPDATE — but ONLY the new scoring_config table.
//   It never writes to any existing/legacy table.

const db = require("../../db/knex");

const TABLE = "scoring_config";

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    weights: typeof row.weights === "string" ? JSON.parse(row.weights) : row.weights,
  };
}

/** Active college-specific override for (collegeId, profile), or null. */
async function getActiveForCollege(collegeId, profile) {
  const row = await db(TABLE)
    .where({ college_id: collegeId, profile, is_active: true })
    .orderBy("version", "desc")
    .first();
  return normalize(row);
}

/** Active system default (college_id IS NULL) for a profile, or null. */
async function getActiveDefault(profile) {
  const row = await db(TABLE)
    .whereNull("college_id")
    .where({ profile, is_active: true })
    .orderBy("version", "desc")
    .first();
  return normalize(row);
}

/** Version history for a college + profile (college rows only), newest first. */
async function listVersions(collegeId, profile) {
  const rows = await db(TABLE)
    .where({ college_id: collegeId, profile })
    .orderBy("version", "desc");
  return rows.map(normalize);
}

/**
 * Append a new active version for (collegeId, profile) and deactivate the
 * previous one — a single transaction on the NEW table only.
 * @returns the inserted row (normalized)
 */
async function insertVersion({ collegeId, profile, weights, updatedBy }) {
  return db.transaction(async (trx) => {
    const current = await trx(TABLE)
      .where({ college_id: collegeId, profile })
      .max("version as max_version")
      .first();
    const nextVersion = Number(current?.max_version || 0) + 1;

    await trx(TABLE)
      .where({ college_id: collegeId, profile, is_active: true })
      .update({ is_active: false, updated_at: trx.fn.now() });

    const [row] = await trx(TABLE)
      .insert({
        college_id: collegeId,
        profile,
        weights: JSON.stringify(weights),
        version: nextVersion,
        is_active: true,
        updated_by: updatedBy ?? null,
      })
      .returning("*");
    return normalize(row);
  });
}

module.exports = {
  getActiveForCollege,
  getActiveDefault,
  listVersions,
  insertVersion,
};
