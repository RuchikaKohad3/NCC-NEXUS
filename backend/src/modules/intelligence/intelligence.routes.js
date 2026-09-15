// Responsibility: Route definitions for the Intelligence Layer (/api/intel).
// Layer: Intelligence (Layer 1) routes.
// Depends on: existing auth.middleware (authenticate) + authorize.middleware (authorizeRole),
//   and intelligence.controller.
// Must never be depended on by: any existing/legacy module.
// Mounted additively in app.js as app.use("/api/intel", ...). SUO is role CADET,
// so authorizeRole("CADET") covers SUO; per-record ownership/college scope is
// enforced in the controller.

const express = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRole } = require("../../middlewares/authorize.middleware");
const controller = require("./intelligence.controller");

const router = express.Router();

// Staff = ANO, or a CADET whose rank is Senior Under Officer (SUO). Cohort-wide
// readiness must never be exposed to a regular cadet.
const staffOnly = (req, res, next) => {
  const role = String(req.user?.role || "").toUpperCase();
  const isSuo =
    role === "CADET" &&
    String(req.user?.rank || "").toLowerCase() === "senior under officer";
  if (role === "ANO" || isSuo) return next();
  return res.status(403).json({ message: "Access denied" });
};

router.use(authenticate);

// ── Cohort (staff only) ──
router.get("/readiness", staffOnly, controller.getCollegeReadiness);
router.post("/recompute-college", staffOnly, controller.recomputeCollege);

router.get(
  "/cadet/:regimentalNo",
  authorizeRole("ANO", "CADET", "ALUMNI"),
  controller.getCadetReadiness
);

router.post(
  "/recompute",
  authorizeRole("ANO", "CADET", "ALUMNI"),
  controller.recompute
);

// ── Scoring-config (M11) ──
// Reading the active weights is staff-wide; TUNING them is an officer decision,
// so writes are gated to ANO only.
const anoOnly = (req, res, next) => {
  if (String(req.user?.role || "").toUpperCase() === "ANO") return next();
  return res.status(403).json({ message: "Only an ANO can change scoring weights." });
};

router.get("/config", staffOnly, controller.getScoringConfig);
router.put("/config", anoOnly, controller.putScoringConfig);

module.exports = router;
