const express = require("express");
const {
  anoLogin,
  cadetLogin,
  resetPasswordLoggedIn,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

// Defined routes are relative to /api/auth (from app.js)

// Final URL: POST /api/auth/ano/login
router.post("/ano/login", anoLogin);

// Final URL: POST /api/auth/cadet/login
router.post("/cadet/login", cadetLogin);

// Final URL: POST /api/auth/reset-password
router.post("/reset-password", authenticate, resetPasswordLoggedIn);

module.exports = router;