// Responsibility: Read/write access for the NEW `decision_runs` +
//   `decision_selections` tables — persisting a confirmed board roster and
//   reading run history (M8.2b).
// Layer: Decision Support (Layer 2) — data access for the NEW tables only.
// Depends on: db/knex and the two new tables.
// Must never be depended on by: any existing/legacy module.
// NOTE: This file MAY INSERT — but ONLY into decision_runs/decision_selections.
//   It never writes to any existing/legacy table.

const db = require("../../db/knex");

const RUNS = "decision_runs";
const SELECTIONS = "decision_selections";

const parseJson = (v) => (typeof v === "string" ? JSON.parse(v) : v);

function normalizeRun(row) {
  if (!row) return null;
  return {
    ...row,
    run_id: Number(row.run_id),
    params: parseJson(row.params),
    weights: parseJson(row.weights),
    summary: parseJson(row.summary),
  };
}

function normalizeSelection(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    run_id: Number(row.run_id),
    rank_position: row.rank_position == null ? null : Number(row.rank_position),
    overall_score: row.overall_score == null ? null : Number(row.overall_score),
    overall_confidence: row.overall_confidence == null ? null : Number(row.overall_confidence),
    reasons: parseJson(row.reasons),
    caveats: parseJson(row.caveats),
    strengths: parseJson(row.strengths),
  };
}

/**
 * Persist one run + all its selection rows atomically (transaction over the
 * NEW tables only). Returns the run with its selections.
 */
async function insertRunWithSelections({ run, selections }) {
  return db.transaction(async (trx) => {
    const [runRow] = await trx(RUNS)
      .insert({
        college_id: run.college_id,
        run_type: run.run_type || "camp_selection",
        profile: run.profile,
        params: JSON.stringify(run.params),
        weights: JSON.stringify(run.weights),
        summary: JSON.stringify(run.summary),
        status: "confirmed",
        confirmed_by: run.confirmed_by ?? null,
      })
      .returning("*");

    let selectionRows = [];
    if (selections.length) {
      selectionRows = await trx(SELECTIONS)
        .insert(
          selections.map((s) => ({
            run_id: runRow.run_id,
            regimental_no: s.regimental_no,
            full_name: s.full_name ?? null,
            rank_name: s.rank_name ?? null,
            tier: s.tier,
            rank_position: s.rank_position ?? null,
            overall_score: s.overall_score ?? null,
            overall_confidence: s.overall_confidence ?? null,
            reasons: JSON.stringify(s.reasons || []),
            caveats: JSON.stringify(s.caveats || []),
            strengths: JSON.stringify(s.strengths || []),
          }))
        )
        .returning("*");
    }

    return {
      run: normalizeRun(runRow),
      selections: selectionRows.map(normalizeSelection),
    };
  });
}

/** Run history for a college, newest first (no selection rows — list view). */
async function listRunsByCollege(collegeId, { limit = 50 } = {}) {
  const rows = await db(RUNS)
    .where({ college_id: collegeId })
    .orderBy("created_at", "desc")
    .limit(limit);
  return rows.map(normalizeRun);
}

/** One run (college-scoped) with its selections ordered by tier + rank. */
async function getRunWithSelections(runId, collegeId) {
  const runRow = await db(RUNS).where({ run_id: runId, college_id: collegeId }).first();
  if (!runRow) return null;
  const selectionRows = await db(SELECTIONS)
    .where({ run_id: runId })
    .orderBy([
      { column: "tier", order: "asc" },
      { column: "rank_position", order: "asc", nulls: "last" },
    ]);
  return {
    run: normalizeRun(runRow),
    selections: selectionRows.map(normalizeSelection),
  };
}

module.exports = { insertRunWithSelections, listRunsByCollege, getRunWithSelections };
