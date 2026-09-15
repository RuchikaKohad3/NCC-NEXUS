// Responsibility: HTTP handlers for the Decision layer (at-risk detection).
// Layer: Decision Support (Layer 2) controller — thin; scope checks + delegation.
// Depends on: decision.service.
// Must never be depended on by: any existing/legacy module.

const service = require("./decision.service");

function requireCollege(req, res) {
  const collegeId = req.user.college_id;
  if (collegeId == null) {
    res.status(400).json({ message: "No college context for this user" });
    return null;
  }
  return collegeId;
}

// GET /api/decision/at-risk — live at-risk list for the caller's college.
async function getAtRisk(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const rows = await service.getCollegeRisk(collegeId);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

// POST /api/decision/at-risk/scan — compute + persist flags + emit socket event.
async function scan(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const io = req.app.get("io");
    const result = await service.scanCollege(collegeId, { io });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

// GET /api/decision/camp-selection — live ranked selection for the caller's college.
// Query: slots (>=1, required), reserves (>=0), profile, minReadiness (0..100).
async function campSelection(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const result = await service.getCampSelection(collegeId, req.query);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

// GET /api/decision/flags — persisted active flags (open + acknowledged).
async function listFlags(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const rows = await service.listFlags(collegeId);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/decision/flags/:id/acknowledge — mark a flag acknowledged.
async function acknowledge(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid flag id" });
    }
    const flag = await service.acknowledgeFlag(id, collegeId, req.user.user_id);
    return res.json(flag);
  } catch (err) {
    return next(err);
  }
}

// ── Auditable board rosters (M8.2b) ──

// POST /api/decision/camp-selection/confirm — persist the current board as a run.
// Body: { slots, reserves?, profile?, minReadiness? } (same params as the live board).
async function confirmSelection(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const result = await service.confirmCampSelection(collegeId, req.user.user_id, req.body || {});
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

// GET /api/decision/runs — confirmed-run history for the caller's college.
async function listRuns(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const rows = await service.listRuns(collegeId);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

// GET /api/decision/runs/:id — one confirmed run with its full roster.
async function getRun(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid run id" });
    }
    const result = await service.getRun(collegeId, id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAtRisk,
  scan,
  campSelection,
  listFlags,
  acknowledge,
  confirmSelection,
  listRuns,
  getRun,
};
