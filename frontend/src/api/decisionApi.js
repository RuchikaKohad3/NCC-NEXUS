// Responsibility: Frontend API client for the Decision layer (/api/decision) —
//   at-risk watchlist, scan/reconcile, persisted flags, and acknowledge.
// Layer: Command Center UI (Layer 4) — data access from the browser.
// Depends on: axios + VITE_API_BASE_URL; JWT in localStorage (Bearer interceptor).
// Must never be depended on by: backend code. Mirrors api/intelApi.js exactly.

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/decision`,
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const decisionApi = {
  // Live at-risk list computed from the latest snapshots (staff only).
  getAtRisk: () => client.get("/at-risk"),
  // Live ranked camp/RDC selection for the caller's college (staff only).
  // params: { slots, reserves, profile, minReadiness }.
  getCampSelection: (params) => client.get("/camp-selection", { params }),
  // Recompute + reconcile persisted flags for the caller's college (staff only).
  scan: () => client.post("/at-risk/scan"),
  // Persisted active flags (open + acknowledged) for the caller's college.
  getFlags: () => client.get("/flags"),
  // Mark one persisted flag acknowledged.
  acknowledge: (id) => client.patch(`/flags/${id}/acknowledge`),

  // ── Auditable board rosters (M8.2b) ──
  // Persist the current board as a confirmed run. body: { slots, reserves, profile, minReadiness }.
  confirmSelection: (params) => client.post("/camp-selection/confirm", params),
  // Confirmed-run history for the caller's college.
  listRuns: () => client.get("/runs"),
  // One confirmed run with its full roster.
  getRun: (id) => client.get(`/runs/${id}`),
};

export default decisionApi;
