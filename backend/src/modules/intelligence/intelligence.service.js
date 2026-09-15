// Responsibility: Orchestrate the full readiness pipeline —
//   read all pillar signals (legacy, SELECT-only) -> build composite snapshot (pure)
//   -> persist (new table). Also the profile-weighting surface (M11): resolve
//   tunable weights and re-aggregate stored pillars under a decision profile.
// Layer: Intelligence (Layer 1) service.
// Depends on: intelligence.repository (legacy read), snapshot.builder (pure),
//   snapshot.repository (new-table read/write), scoringConfig.service (weights),
//   scoring/aggregate (pure).
// Must never be depended on by: any existing/legacy module.

const legacyRepo = require("./intelligence.repository");
const snapshotRepo = require("./snapshot.repository");
const { buildSnapshot } = require("./snapshot.builder");
const scoringConfig = require("./scoringConfig.service");
const { aggregate } = require("./scoring/aggregate");

/**
 * Recompute and persist the latest readiness snapshot for one cadet.
 * @param {string} regimentalNo
 * @param {{referenceDate?:(Date|string)}} [options]
 */
async function recomputeCadet(regimentalNo, options = {}) {
  const identity = await legacyRepo.getCadetIdentity(regimentalNo);
  // Fail fast: without a cadet_profiles row the snapshot's FK insert would fail
  // anyway, and a snapshot keyed to a non-existent cadet could never be retrieved.
  if (!identity) {
    const err = new Error(`Cadet identity not found for ${regimentalNo}`);
    err.status = 404;
    throw err;
  }
  const userId = identity.userId;
  const rankId = identity.rankId;

  const [
    attendanceObservations,
    quizAttempts,
    fines,
    meetings,
    communityEvents,
    leadershipInputs,
  ] = await Promise.all([
    legacyRepo.getAttendanceObservations(regimentalNo),
    legacyRepo.getQuizAttempts(userId),
    legacyRepo.getFines(regimentalNo),
    legacyRepo.getMeetingAttendance(userId),
    legacyRepo.getCommunityEventCount(userId),
    legacyRepo.getLeadershipInputs(regimentalNo, userId, rankId),
  ]);

  const snapshot = buildSnapshot({
    regimentalNo,
    collegeId: identity.collegeId,
    referenceDate: options.referenceDate,
    attendanceObservations,
    quizAttempts,
    fines,
    meetings,
    communityEvents,
    leadership: {
      ...leadershipInputs,
      joiningYear: identity.joiningYear,
    },
  });

  return snapshotRepo.insertSnapshot(snapshot);
}

/**
 * Read the latest persisted snapshot for a cadet (or null if none yet).
 * @param {string} regimentalNo
 */
async function getCadetReadiness(regimentalNo) {
  return snapshotRepo.getLatestByCadet(regimentalNo);
}

/**
 * Pure merge of a college roster with its latest snapshots. Cadets without a
 * snapshot are still returned (has_snapshot=false) so the cohort view is complete.
 * @param {Array<{regimentalNo:string, fullName:string, rankName:(string|null)}>} cadets
 * @param {Array<object>} snapshots latest snapshot rows
 */
function mergeCohort(cadets = [], snapshots = []) {
  const byReg = new Map(snapshots.map((s) => [s.regimental_no, s]));
  return cadets.map((c) => {
    const snap = byReg.get(c.regimentalNo) || null;
    return {
      regimental_no: c.regimentalNo,
      full_name: c.fullName,
      rank_name: c.rankName,
      overall_score: snap ? snap.overall_score : null,
      overall_confidence: snap ? snap.overall_confidence : null,
      computed_at: snap ? snap.computed_at : null,
      pillars: snap ? snap.pillars : null,
      has_snapshot: Boolean(snap),
    };
  });
}

/**
 * Cohort readiness for a whole college: every cadet with their latest snapshot (or null).
 * @param {number} collegeId
 */
async function getCollegeReadiness(collegeId) {
  const [cadets, snapshots] = await Promise.all([
    legacyRepo.getCollegeCadets(collegeId),
    snapshotRepo.getLatestSnapshotsByCollege(collegeId),
  ]);
  return mergeCohort(cadets, snapshots);
}

/**
 * Recompute + persist snapshots for every cadet in a college (sequential to stay
 * gentle on the DB). Returns how many were processed.
 * @param {number} collegeId
 * @param {{referenceDate?:(Date|string)}} [options]
 */
async function recomputeCollege(collegeId, options = {}) {
  const cadets = await legacyRepo.getCollegeCadets(collegeId);
  let recomputed = 0;
  for (const c of cadets) {
    await recomputeCadet(c.regimentalNo, options);
    recomputed += 1;
  }
  return { recomputed, total: cadets.length };
}

/**
 * Pure: re-aggregate a cohort's STORED pillars under a different weight profile.
 * Snapshots are always computed/stored under "general" (stable history); a
 * profile-specific view re-weighs at read time instead of exploding the
 * snapshot table per profile (ADL-012). Rows without a snapshot pass through
 * unchanged — the fairness rule (ADL-005) is preserved because aggregate()
 * itself is confidence-aware.
 *
 * @param {Array<object>} cohort output of getCollegeReadiness
 * @param {Object<string,number>} weights normalised weight fractions
 */
function applyProfileWeights(cohort = [], weights) {
  if (!weights) return cohort;
  return cohort.map((row) => {
    if (!row.has_snapshot || !row.pillars) return row;
    const overall = aggregate(row.pillars, weights);
    return { ...row, overall_score: overall.score, overall_confidence: overall.confidence };
  });
}

/**
 * Cohort readiness re-weighed under a decision profile's active weights.
 * Chain per scoringConfig.service: college override → system default → built-in.
 * For "general" with no stored override this is byte-identical to
 * getCollegeReadiness (zero behaviour change for existing callers).
 *
 * @returns {{cohort:Array<object>, weightsInfo:{profile,source,version,weights}}}
 */
async function getCollegeReadinessForProfile(collegeId, profile = "general") {
  const [cohort, resolved] = await Promise.all([
    getCollegeReadiness(collegeId),
    scoringConfig.resolveWeights(collegeId, profile),
  ]);
  if (profile === "general" && resolved.source === "builtin") {
    // Stored snapshots were aggregated under exactly these weights already.
    return { cohort, weightsInfo: resolved };
  }
  return { cohort: applyProfileWeights(cohort, resolved.weights), weightsInfo: resolved };
}

module.exports = {
  recomputeCadet,
  getCadetReadiness,
  mergeCohort,
  getCollegeReadiness,
  recomputeCollege,
  applyProfileWeights,
  getCollegeReadinessForProfile,
  resolveWeights: scoringConfig.resolveWeights,
};
