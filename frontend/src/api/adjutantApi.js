// Responsibility: Frontend API client for the AI Adjutant (/api/adjutant) —
//   conversations, the chat turn loop, and the proposal approve/reject flow.
// Layer: Command Center UI (Layer 4) — data access from the browser.
// Depends on: axios + VITE_API_BASE_URL; JWT in localStorage (Bearer interceptor).
// Must never be depended on by: backend code. Mirrors api/intelApi.js exactly.

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/adjutant`,
  timeout: 45000, // a turn may include several model+tool rounds
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adjutantApi = {
  // Conversations (college-scoped, staff only).
  listConversations: () => client.get("/conversations"),
  createConversation: (title) => client.post("/conversations", title ? { title } : {}),
  getMessages: (conversationId) => client.get(`/conversations/${conversationId}/messages`),
  // One officer turn — returns { user, assistant, proposals }.
  sendMessage: (conversationId, message) =>
    client.post(`/conversations/${conversationId}/messages`, { message }),

  // Human-gated action proposals.
  listProposals: (status) => client.get("/proposals", { params: status ? { status } : {} }),
  approveProposal: (proposalId) => client.post(`/proposals/${proposalId}/approve`),
  rejectProposal: (proposalId) => client.post(`/proposals/${proposalId}/reject`),
};

export default adjutantApi;
