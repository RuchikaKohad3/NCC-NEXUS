// Responsibility: Orchestrate at-risk detection over a college — assess the cohort
//   (pure), reconcile against persisted flags, and expose flag lifecycle actions.
// Layer: Decision Support (Layer 2) service. Depends DOWNWARD on the Intelligence
//   layer's read output; never the reverse.
// Depends on: intelligence.service (cohort read), decision.repository (new table),
//   recipes/atRisk (pure).
// Must never be depended on by: legacy modules or the Intelligence layer.

const intelligenceService = require("../intelligence/intelligence.service");
const decisionRepo = require("./decision.repository");
const runsRepo = require("./decisionRuns.repository");
const { assessRisk } = require("./recipes/atRisk");
const { selectForCamp } = require("./recipes/campSelection");

const SELECTION_PROFILES = ["rdc", "promotion", "certificate", "general"];

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

/**
 * Pure: run the at-risk recipe across a cohort and return only at-risk cadets,
 * sorted by severity (high first) then by ascending readiness.
 * @param {Array<object>} cohort output of intelligenceService.getCollegeReadiness
 */
function assessCohort(cohort = []) {
  const out = [];
  for (const c of cohort) {
    if (!c.has_snapshot) continue;
    const risk = assessRisk({
      overall_score: c.overall_score,
      overall_confidence: c.overall_confidence,
      pillars: c.pillars,
    });
    if (risk.atRisk) {
      out.push({
        regimental_no: c.regimental_no,
        full_name: c.full_name,
        rank_name: c.rank_name,
        overall_score: c.overall_score,
        ...risk,
      });
    }
  }
  out.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      (a.overall_score ?? 101) - (b.overall_score ?? 101)
  );
  return out;
}

/**
 * Pure: diff the current at-risk list against persisted open/acknowledged flags.
 * @returns {{toInsert:Array, toUpdate:Array<{id:number, risk:object}>, toResolve:Array}}
 */
function reconcilePlan(atRisk = [], activeFlags = []) {
  const flagByReg = new Map(activeFlags.map((f) => [f.regimental_no, f]));
  const atRiskRegs = new Set(atRisk.map((a) => a.regimental_no));

  const toInsert = [];
  const toUpdate = [];
  const toResolve = [];

  for (const a of atRisk) {
    const existing = flagByReg.get(a.regimental_no);
    if (existing) toUpdate.push({ id: existing.id, risk: a });
    else toInsert.push(a);
  }
  for (const f of activeFlags) {
    if (!atRiskRegs.has(f.regimental_no)) toResolve.push(f);
  }
  return { toInsert, toUpdate, toResolve };
}

/** Live at-risk list for a college (computed from latest snapshots, not persisted). */
async function getCollegeRisk(collegeId) {
  const cohort = await intelligenceService.getCollegeReadiness(collegeId);
  return assessCohort(cohort);
}

/** Compute + reconcile persisted flags for a college; emit a transient socket event. */
async function scanCollege(collegeId, { io } = {}) {
  const atRisk = await getCollegeRisk(collegeId);
  const activeFlags = await decisionRepo.listActiveByCollege(collegeId);
  const plan = reconcilePlan(atRisk, activeFlags);

  for (const a of plan.toInsert) {
    await decisionRepo.insertFlag({
      regimental_no: a.regimental_no,
      college_id: collegeId,
      severity: a.severity,
      drivers: a.drivers,
      recommendedAction: a.recommendedAction,
      explanation: a.explanation,
      dataConfidence: a.dataConfidence,
    });
  }
  for (const u of plan.toUpdate) {
    await decisionRepo.updateFlag(u.id, {
      severity: u.risk.severity,
      drivers: u.risk.drivers,
      recommendedAction: u.risk.recommendedAction,
      explanation: u.risk.explanation,
      dataConfidence: u.risk.dataConfidence,
    });
  }
  for (const f of plan.toResolve) {
    await decisionRepo.resolveFlag(f.id);
  }

  // Transient real-time push (no DB write => contract-safe). Best-effort.
  if (io) {
    try {
      io.to(`college_${collegeId}`).emit("risk:updated", {
        collegeId,
        atRiskCount: atRisk.length,
      });
    } catch {
      /* socket emit is best-effort */
    }
  }

  return {
    atRisk: atRisk.length,
    inserted: plan.toInsert.length,
    updated: plan.toUpdate.length,
    resolved: plan.toResolve.length,
  };
}

/**
 * Pure: validate + coerce raw camp-selection request params (e.g. from a query
 * string, where everything arrives as a string). Throws a 400-tagged Error on
 * bad input so the controller can surface a clear message.
 * @returns {{slots:number, reserves:number, profile:string, minReadiness:(number|null)}}
 */
function normalizeSelectionParams(raw = {}) {
  const bad = (message) => {
    const e = new Error(message);
    e.status = 400;
    return e;
  };

  const slots = Number(raw.slots);
  if (!Number.isInteger(slots) || slots < 1) {
    throw bad("`slots` must be an integer >= 1.");
  }

  let reserves = 0;
  if (raw.reserves != null && raw.reserves !== "") {
    reserves = Number(raw.reserves);
    if (!Number.isInteger(reserves) || reserves < 0) {
      throw bad("`reserves` must be an integer >= 0.");
    }
  }

  const profile = raw.profile ? String(raw.profile).trim().toLowerCase() : "rdc";
  if (!SELECTION_PROFILES.includes(profile)) {
    throw bad(`\`profile\` must be one of: ${SELECTION_PROFILES.join(", ")}.`);
  }

  let minReadiness = null;
  if (raw.minReadiness != null && raw.minReadiness !== "") {
    minReadiness = Number(raw.minReadiness);
    if (!Number.isFinite(minReadiness) || minReadiness < 0 || minReadiness > 100) {
      throw bad("`minReadiness` must be a number between 0 and 100.");
    }
  }

  return { slots, reserves, profile, minReadiness };
}

/**
 * Live camp/RDC selection over a college's latest snapshots (nothing persisted).
 * M11: the cohort is re-weighed under the requested profile's ACTIVE weights
 * (college override → system default → built-in) before ranking, so
 * ?profile=rdc|promotion|certificate genuinely changes the board, not just a label.
 */
async function getCampSelection(collegeId, rawParams = {}) {
  const opts = normalizeSelectionParams(rawParams);
  const { cohort, weightsInfo } = await intelligenceService.getCollegeReadinessForProfile(
    collegeId,
    opts.profile
  );
  const selection = selectForCamp(cohort, opts);
  return { ...selection, weights: weightsInfo };
}

/** Persisted active flags (open + acknowledged) for a college. */
async function listFlags(collegeId) {
  return decisionRepo.listActiveByCollege(collegeId);
}

/** Acknowledge a flag, enforcing that it belongs to the caller's college. */
async function acknowledgeFlag(id, collegeId, userId) {
  const flagCollege = await decisionRepo.getFlagCollege(id);
  if (flagCollege == null || Number(flagCollege) !== Number(collegeId)) {
    const err = new Error("Flag not found");
    err.status = 404;
    throw err;
  }
  return decisionRepo.acknowledgeFlag(id, userId);
}

// ── Auditable board rosters (M8.2b) ──

/**
 * Pure: flatten a live selection result into decision_selections row shapes.
 * Identity is denormalised deliberately (ADL-013) — the roster is a point-in-time
 * record that must survive later cadet edits/deletions.
 */
function buildRosterRows(selection) {
  const tiers = [
    ["selected", selection.selected || []],
    ["standby", selection.standby || []],
    ["not_selected", selection.notSelected || []],
    ["unranked", selection.unranked || []],
  ];
  const rows = [];
  for (const [tier, list] of tiers) {
    for (const c of list) {
      rows.push({
        regimental_no: c.regimental_no,
        full_name: c.full_name ?? null,
        rank_name: c.rank_name ?? null,
        tier,
        rank_position: c.rank ?? null,
        overall_score: c.overall_score ?? null,
        overall_confidence: c.overall_confidence ?? null,
        reasons: c.reasons || [],
        caveats: c.caveats || [],
        strengths: c.strengths || [],
      });
    }
  }
  return rows;
}

/**
 * Confirm a board: recompute the live selection under the requested profile's
 * active weights, then persist the whole roster atomically. The persisted run
 * stores params + weights + summary, so the decision is reproducible on record.
 */
async function confirmCampSelection(collegeId, userId, rawParams = {}) {
  const selection = await getCampSelection(collegeId, rawParams);
  const rows = buildRosterRows(selection);
  if (!rows.length) {
    const err = new Error("Nothing to confirm — the cohort is empty.");
    err.status = 409;
    throw err;
  }
  return runsRepo.insertRunWithSelections({
    run: {
      college_id: collegeId,
      run_type: "camp_selection",
      profile: selection.profile,
      params: {
        slots: selection.slots,
        reserves: selection.reserves,
        minReadiness: selection.summary?.minReadiness ?? null,
      },
      weights: selection.weights || null,
      summary: selection.summary,
      confirmed_by: userId ?? null,
    },
    selections: rows,
  });
}

/** Confirmed-run history for a college (list view, newest first). */
async function listRuns(collegeId) {
  return runsRepo.listRunsByCollege(collegeId);
}

/** One confirmed run with its full roster, college-scoped (404 outside scope). */
async function getRun(collegeId, runId) {
  const result = await runsRepo.getRunWithSelections(runId, collegeId);
  if (!result) {
    const err = new Error("Run not found");
    err.status = 404;
    throw err;
  }
  return result;
}

module.exports = {
  assessCohort,
  reconcilePlan,
  getCollegeRisk,
  scanCollege,
  normalizeSelectionParams,
  getCampSelection,
  buildRosterRows,
  confirmCampSelection,
  listRuns,
  getRun,
  listFlags,
  acknowledgeFlag,
};
