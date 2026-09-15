// Responsibility: Frontend API client for the Intelligence Layer (/api/intel).
// Layer: Command Center UI (Layer 4) — data access from the browser.
// Depends on: axios + VITE_API_BASE_URL; JWT in localStorage (Bearer interceptor).
// Must never be depended on by: backend code. Mirrors the existing api/*.js pattern.

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/intel`,
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const intelApi = {
  // Latest readiness snapshot for a cadet.
  getCadetReadiness: (regimentalNo) =>
    client.get(`/cadet/${encodeURIComponent(regimentalNo)}`),
  // Recompute + persist a fresh snapshot for a cadet.
  recompute: (regimentalNo) => client.post("/recompute", { regimental_no: regimentalNo }),
  // Cohort readiness for the caller's college (staff only).
  getCollegeReadiness: () => client.get("/readiness"),
  // Recompute every cadet in the caller's college (staff only).
  recomputeCollege: () => client.post("/recompute-college"),
  // Scoring-config (M11): resolved weights + history for a profile (staff only).
  getConfig: (profile) => client.get("/config", { params: { profile } }),
  // Save a new weight version for the caller's college (ANO only).
  putConfig: (profile, weights) => client.put("/config", { profile, weights }),
};

export default intelApi;
