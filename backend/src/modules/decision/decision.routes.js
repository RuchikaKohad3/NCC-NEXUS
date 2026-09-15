// Responsibility: Route definitions for the Decision layer (/api/decision).
// Layer: Decision Support (Layer 2) routes.
// Depends on: existing auth.middleware (authenticate) + decision.controller.
// Must never be depended on by: any existing/legacy module.
// Mounted additively in app.js as app.use("/api/decision", ...). All routes are
// staff-only (ANO, or a CADET whose rank is Senior Under Officer) — the risk
// picture must never be exposed to a regular cadet.

const express = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const controller = require("./decision.controller");

const router = express.Router();

const staffOnly = (req, res, next) => {
  const role = String(req.user?.role || "").toUpperCase();
  const isSuo =
    role === "CADET" &&
    String(req.user?.rank || "").toLowerCase() === "senior under officer";
  if (role === "ANO" || isSuo) return next();
  return res.status(403).json({ message: "Access denied" });
};

router.use(authenticate);
router.use(staffOnly);

router.get("/at-risk", controller.getAtRisk);
router.post("/at-risk/scan", controller.scan);
router.get("/camp-selection", controller.campSelection);
router.get("/flags", controller.listFlags);
router.patch("/flags/:id/acknowledge", controller.acknowledge);

// ── Auditable board rosters (M8.2b) ──
router.post("/camp-selection/confirm", controller.confirmSelection);
router.get("/runs", controller.listRuns);
router.get("/runs/:id", controller.getRun);

module.exports = router;
