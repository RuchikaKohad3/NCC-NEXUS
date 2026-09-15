// Responsibility: HTTP handlers for the Intelligence Layer (attendance readiness).
// Layer: Intelligence (Layer 1) controller — thin; validation + access control + delegation.
// Depends on: intelligence.service, intelligence.repository (for college-scope check).
// Must never be depended on by: any existing/legacy module.

const service = require("./intelligence.service");
const legacyRepo = require("./intelligence.repository");

// Multi-tenant + ownership guard. Cadets/Alumni may only access their own record;
// staff (ANO) may access cadets within their own college.
async function assertAccess(req, regimentalNo) {
  const role = String(req.user.role || "").toUpperCase();

  if (role === "CADET" || role === "ALUMNI") {
    if (req.user.regimental_no !== regimentalNo) {
      const err = new Error("Access denied");
      err.status = 403;
      throw err;
    }
    return;
  }

  const collegeId = await legacyRepo.getCadetCollegeId(regimentalNo);
  if (collegeId == null || Number(collegeId) !== Number(req.user.college_id)) {
    const err = new Error("Access denied");
    err.status = 403;
    throw err;
  }
}

// GET /api/intel/cadet/:regimentalNo — latest attendance readiness snapshot.
async function getCadetReadiness(req, res, next) {
  try {
    const regimentalNo = String(req.params.regimentalNo || "").trim();
    if (!regimentalNo) {
      return res.status(400).json({ message: "regimental_no is required" });
    }
    await assertAccess(req, regimentalNo);

    const snapshot = await service.getCadetReadiness(regimentalNo);
    if (!snapshot) {
      return res
        .status(404)
        .json({ message: "No readiness snapshot yet. Run POST /api/intel/recompute first." });
    }
    return res.json(snapshot);
  } catch (err) {
    return next(err);
  }
}

// POST /api/intel/recompute { regimental_no } — recompute + persist one cadet's snapshot.
async function recompute(req, res, next) {
  try {
    const regimentalNo = String(req.body?.regimental_no || "").trim();
    if (!regimentalNo) {
      return res.status(400).json({ message: "regimental_no is required" });
    }
    await assertAccess(req, regimentalNo);

    const snapshot = await service.recomputeCadet(regimentalNo, { referenceDate: new Date() });
    return res.status(201).json(snapshot);
  } catch (err) {
    return next(err);
  }
}

// GET /api/intel/readiness — cohort readiness for the caller's college (staff only).
async function getCollegeReadiness(req, res, next) {
  try {
    const collegeId = req.user.college_id;
    if (collegeId == null) {
      return res.status(400).json({ message: "No college context for this user" });
    }
    const rows = await service.getCollegeReadiness(collegeId);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

// POST /api/intel/recompute-college — recompute every cadet in the caller's college (staff only).
async function recomputeCollege(req, res, next) {
  try {
    const collegeId = req.user.college_id;
    if (collegeId == null) {
      return res.status(400).json({ message: "No college context for this user" });
    }
    const result = await service.recomputeCollege(collegeId, { referenceDate: new Date() });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

// ── Scoring-config (M11) ──

const scoringConfig = require("./scoringConfig.service");

// GET /api/intel/config?profile= — resolved weights + version history (staff only).
async function getScoringConfig(req, res, next) {
  try {
    const collegeId = req.user.college_id;
    if (collegeId == null) {
      return res.status(400).json({ message: "No college context for this user" });
    }
    const profile = String(req.query.profile || "general").trim().toLowerCase();
    const view = await scoringConfig.getConfigView(collegeId, profile);
    return res.json(view);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/intel/config { profile, weights } — save a new version (ANO only; the
// route layer enforces the role, this handler enforces college context + validity).
async function putScoringConfig(req, res, next) {
  try {
    const collegeId = req.user.college_id;
    if (collegeId == null) {
      return res.status(400).json({ message: "No college context for this user" });
    }
    const profile = String(req.body?.profile || "general").trim().toLowerCase();
    const result = await scoringConfig.saveWeights({
      collegeId,
      profile,
      weights: req.body?.weights,
      userId: req.user.user_id,
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getCadetReadiness,
  recompute,
  getCollegeReadiness,
  recomputeCollege,
  getScoringConfig,
  putScoringConfig,
};
