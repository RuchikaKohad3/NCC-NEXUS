import axios from "axios";
import { API_BASE_URL } from "./config";

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/donations`,
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const wrapped = new Error(error?.response?.data?.message || "Request failed");
    wrapped.status = error?.response?.status;
    wrapped.payload = error?.response?.data;
    throw wrapped;
  }
);

/* ── Mock Data ── */

const MOCK_NEEDS = [
  { id: "need-1", title: "Uniform Fund", description: "Provide NCC uniforms to new cadets who cannot afford them. Includes shirts, trousers, belts, and caps.", targetAmount: 50000, raisedAmount: 32000, status: "active", category: "Equipment" },
  { id: "need-2", title: "Camp Equipment", description: "Purchase tents, sleeping bags, and field equipment for the upcoming annual training camp.", targetAmount: 75000, raisedAmount: 45000, status: "active", category: "Training" },
  { id: "need-3", title: "First Aid Supplies", description: "Replenish first aid kits and medical supplies for drill sessions and camps.", targetAmount: 15000, raisedAmount: 15000, status: "fulfilled", category: "Medical" },
  { id: "need-4", title: "Sports Equipment", description: "Footballs, volleyballs, and athletics gear for inter-unit sports competitions.", targetAmount: 25000, raisedAmount: 8000, status: "active", category: "Sports" },
  { id: "need-5", title: "Study Material", description: "Books and study material for NCC B and C certificate exam preparation.", targetAmount: 20000, raisedAmount: 12000, status: "active", category: "Education" },
];

const MOCK_TIMELINE_COMPLETED = [
  { step: 1, label: "Donation Received", status: "completed", date: "2026-03-10" },
  { step: 2, label: "Funds in Escrow", status: "completed", date: "2026-03-10" },
  { step: 3, label: "Proof Uploaded by SUO", status: "completed", date: "2026-03-14" },
  { step: 4, label: "Verification by System", status: "completed", date: "2026-03-15" },
  { step: 5, label: "Reimbursement Completed", status: "completed", date: "2026-03-16" },
];

const MOCK_TIMELINE_AWAITING = [
  { step: 1, label: "Donation Received", status: "completed", date: "2026-03-15" },
  { step: 2, label: "Funds in Escrow", status: "completed", date: "2026-03-15" },
  { step: 3, label: "Awaiting SUO Utilization", status: "active", date: null },
  { step: 4, label: "Verification Pending", status: "pending", date: null },
  { step: 5, label: "Reimbursement Completed", status: "pending", date: null },
];

const MOCK_TIMELINE_PROOF = [
  { step: 1, label: "Donation Received", status: "completed", date: "2026-03-12" },
  { step: 2, label: "Funds in Escrow", status: "completed", date: "2026-03-12" },
  { step: 3, label: "Proof Uploaded by SUO", status: "completed", date: "2026-03-18" },
  { step: 4, label: "Verification Pending", status: "active", date: null },
  { step: 5, label: "Reimbursement Completed", status: "pending", date: null },
];

const MOCK_MY_DONATIONS = [
  { id: "don-1", donorName: "You", needId: "need-1", needTitle: "Uniform Fund", unitName: "XYZ Engineering College NCC", amount: 5000, paymentMethod: "UPI", message: "For the cadets — Jai Hind!", status: "COMPLETED", createdAt: "2026-03-10", timeline: MOCK_TIMELINE_COMPLETED, utilizationProof: { title: "Uniform Purchase", description: "Purchased 10 sets of NCC uniforms from authorized vendor.", images: [], documents: [] } },
  { id: "don-2", donorName: "You", needId: "need-2", needTitle: "Camp Equipment", unitName: "XYZ Engineering College NCC", amount: 10000, paymentMethod: "Bank Transfer", message: "Best wishes for the camp!", status: "PROOF_UPLOADED", createdAt: "2026-03-12", timeline: MOCK_TIMELINE_PROOF, utilizationProof: { title: "Tent Purchase", description: "Bought 5 tents and 20 sleeping bags for annual camp.", images: [], documents: [] } },
  { id: "don-3", donorName: "You", needId: "need-4", needTitle: "Sports Equipment", unitName: "XYZ Engineering College NCC", amount: 3000, paymentMethod: "UPI", message: "", status: "AWAITING_UTILIZATION", createdAt: "2026-03-15", timeline: MOCK_TIMELINE_AWAITING, utilizationProof: null },
  { id: "don-4", donorName: "You", needId: "need-5", needTitle: "Study Material", unitName: "XYZ Engineering College NCC", amount: 2000, paymentMethod: "Card", message: "All the best for exams", status: "VERIFIED", createdAt: "2026-03-08", timeline: [...MOCK_TIMELINE_PROOF.map((s, i) => i < 4 ? { ...s, status: "completed", date: s.date || "2026-03-19" } : { ...s, status: "active" })], utilizationProof: { title: "Books Purchase", description: "Purchased C certificate preparation books from NCC canteen.", images: [], documents: [] } },
];

const MOCK_LEADERBOARD = [
  { rank: 1, donorName: "Amit Verma", totalDonated: 45000, badge: "Gold", donationCount: 8 },
  { rank: 2, donorName: "Priya Singh", totalDonated: 32000, badge: "Gold", donationCount: 6 },
  { rank: 3, donorName: "Rahul Sharma", totalDonated: 20000, badge: "Silver", donationCount: 4 },
  { rank: 4, donorName: "Neha Gupta", totalDonated: 15000, badge: "Silver", donationCount: 3 },
  { rank: 5, donorName: "Vikram Patel", totalDonated: 10000, badge: "Bronze", donationCount: 2 },
  { rank: 6, donorName: "Sneha Reddy", totalDonated: 8000, badge: "Bronze", donationCount: 2 },
  { rank: 7, donorName: "Arjun Kumar", totalDonated: 5000, badge: "Bronze", donationCount: 1 },
];

const MOCK_RECOGNITION = { totalDonated: 20000, totalOverall: 20000, badge: "Silver", rank: 3, donationCount: 4 };

const MOCK_PENDING_DONATIONS = [
  { id: "don-3", donorName: "Rahul Sharma", needId: "need-4", needTitle: "Sports Equipment", amount: 3000, status: "AWAITING_UTILIZATION", createdAt: "2026-03-15", message: "" },
  { id: "don-5", donorName: "Priya Singh", needId: "need-2", needTitle: "Camp Equipment", amount: 8000, status: "AWAITING_UTILIZATION", createdAt: "2026-03-17", message: "Use it well" },
  { id: "don-6", donorName: "Amit Verma", needId: "need-1", needTitle: "Uniform Fund", amount: 5000, status: "AWAITING_UTILIZATION", createdAt: "2026-03-18", message: "Jai Hind" },
];

const MOCK_SUO_TRACKED = [
  { id: "don-1", donorName: "Rahul Sharma", needTitle: "Uniform Fund", amount: 5000, status: "COMPLETED", createdAt: "2026-03-10", submittedAt: "2026-03-14" },
  { id: "don-2", donorName: "Priya Singh", needTitle: "Camp Equipment", amount: 10000, status: "UNDER_VERIFICATION", createdAt: "2026-03-12", submittedAt: "2026-03-18" },
];

const MOCK_ANO_OVERVIEW = { totalDonated: 185000, projectsCompleted: 8, activeNeeds: 4, totalDonors: 42 };

const MOCK_ANO_PROJECTS = [
  { id: "proj-1", title: "Uniform Fund", status: "IN_PROGRESS", description: "Providing NCC uniforms to cadets across the unit.", raised: 32000, target: 50000 },
  { id: "proj-2", title: "Camp Equipment", status: "IN_PROGRESS", description: "Equipping cadets with camping and field gear.", raised: 45000, target: 75000 },
  { id: "proj-3", title: "First Aid Supplies", status: "COMPLETED", description: "Medical supplies for training and camps.", raised: 15000, target: 15000 },
  { id: "proj-4", title: "Sports Equipment", status: "IN_PROGRESS", description: "Athletics and sports gear for competitions.", raised: 8000, target: 25000 },
  { id: "proj-5", title: "Study Material", status: "IN_PROGRESS", description: "Exam preparation material for NCC certificates.", raised: 12000, target: 20000 },
  { id: "proj-6", title: "Drill Equipment (2025)", status: "COMPLETED", description: "Drill accessories and flags purchased last session.", raised: 18000, target: 18000 },
  { id: "proj-7", title: "Republic Day Parade Prep (2025)", status: "COMPLETED", description: "Costumes and transport for R-Day contingent.", raised: 30000, target: 30000 },
  { id: "proj-8", title: "Community Service Drive (2025)", status: "COMPLETED", description: "Supplies for flood relief community service.", raised: 25000, target: 25000 },
];

/* ── API methods (return mock data — replace with real calls later) ── */

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const donationApi = {
  // Alumni
  getUnitNeeds: async () => { await delay(); return { data: MOCK_NEEDS }; },
  getMyDonations: async () => { await delay(); return { data: MOCK_MY_DONATIONS }; },
  getDonationById: async (donationId) => { await delay(); return { data: MOCK_MY_DONATIONS.find((d) => d.id === donationId) || MOCK_MY_DONATIONS[0] }; },
  createDonation: async (payload) => { await delay(500); return { data: { id: `don-${Date.now()}`, ...payload, status: "AWAITING_UTILIZATION", createdAt: new Date().toISOString().slice(0, 10) } }; },
  getLeaderboard: async () => { await delay(); return { data: MOCK_LEADERBOARD }; },
  getRecognition: async () => { await delay(); return { data: MOCK_RECOGNITION }; },
  reportIssue: async (payload) => { await delay(400); return { data: { success: true, ...payload } }; },

  // SUO
  getPendingDonations: async () => { await delay(); return { data: MOCK_PENDING_DONATIONS }; },
  uploadUtilization: async () => { await delay(600); return { data: { success: true } }; },
  getSuoStatus: async () => { await delay(); return { data: MOCK_SUO_TRACKED }; },

  // ANO
  getAnoOverview: async () => { await delay(); return { data: MOCK_ANO_OVERVIEW }; },
  getAnoProjects: async () => { await delay(); return { data: MOCK_ANO_PROJECTS }; },
};
