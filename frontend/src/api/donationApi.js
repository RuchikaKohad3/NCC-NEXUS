import axios from "axios";
import { API_BASE_URL } from "./config";

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/donations`,
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

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = String(error?.config?.method || "GET").toUpperCase();
    const path = error?.config?.url || "";
    const wrapped = new Error(
      error?.response?.data?.message
      || `${method} ${path} failed`
      || "Request failed"
    );
    wrapped.status = error?.response?.status;
    wrapped.payload = error?.response?.data;
    throw wrapped;
  }
);

const toNumber = (value) => Number(value || 0);

let razorpayScriptPromise;

const loadRazorpayScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay checkout requires a browser"));
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
};

const openRazorpayCheckout = async ({
  order,
  campaignTitle,
}) => {
  const RazorpayCheckout = await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const instance = new RazorpayCheckout({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "NCC Nexus",
      description: campaignTitle || "Donation",
      order_id: order.order_id,
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
      theme: {
        color: "#0f4c81",
      },
    });

    instance.open();
  });
};

const getNeedStatus = (campaign) => {
  if (campaign.status === "CLOSED") {
    return "fulfilled";
  }

  const targetAmount = toNumber(campaign.target_amount);
  const collectedAmount = toNumber(campaign.collected_amount);
  if (targetAmount > 0 && collectedAmount >= targetAmount) {
    return "fulfilled";
  }

  return "active";
};

const buildTimeline = (donation) => {
  const createdAt = donation.created_at;
  const isCompleted = donation.payment_status === "SUCCESS";

  return [
    {
      step: 1,
      label: "Donation Created",
      status: "completed",
      date: createdAt,
    },
    {
      step: 2,
      label: "Payment Verified",
      status: isCompleted ? "completed" : "active",
      date: isCompleted ? createdAt : null,
    },
    {
      step: 3,
      label: "Recorded in Donation History",
      status: isCompleted ? "completed" : "pending",
      date: isCompleted ? createdAt : null,
    },
    {
      step: 4,
      label: "Campaign Total Updated",
      status: isCompleted ? "completed" : "pending",
      date: isCompleted ? createdAt : null,
    },
    {
      step: 5,
      label: "Unit Notified",
      status: isCompleted ? "completed" : "pending",
      date: null,
    },
  ];
};

const normalizeCampaign = (campaign) => ({
  id: String(campaign.campaign_id),
  title: campaign.title,
  description: campaign.description || "Support your NCC unit through this campaign.",
  targetAmount: toNumber(campaign.target_amount),
  raisedAmount: toNumber(campaign.collected_amount),
  minimumAmount: toNumber(campaign.minimum_amount),
  status: getNeedStatus(campaign),
  category: campaign.campaign_type === "DEFAULT" ? "General Fund" : "Campaign",
});

const normalizeDonation = (donation) => ({
  id: String(donation.donation_id),
  needId: String(donation.campaign_id || ""),
  needTitle: donation.campaign_title,
  amount: toNumber(donation.amount),
  status: donation.payment_status === "SUCCESS" ? "COMPLETED" : "AWAITING_PAYMENT",
  createdAt: donation.created_at,
  unitName: "NCC Unit",
  isAnonymous: Boolean(donation.is_anonymous),
  paymentMethod: donation.payment_status === "SUCCESS" ? "Verified Payment" : "Pending Payment",
  paymentOrderId: donation.payment_order_id,
  timeline: buildTimeline(donation),
  utilizationProof: null,
});

const normalizeLeaderboard = (entry) => ({
  rank: Number(entry.rank),
  donorName: entry.username,
  totalDonated: toNumber(entry.total_donated),
  donationCount: Number(entry.donation_count || 0),
  badge: entry.badge || "Bronze",
});

const normalizeRecognition = (recognition) => ({
  totalDonated: toNumber(recognition.total_donated),
  donationCount: Number(recognition.donation_count || 0),
  rank: recognition.rank,
  badge: recognition.badge || "Bronze",
});

const normalizeOverview = (overview) => ({
  totalDonated: toNumber(overview.total_donated),
  projectsCompleted: Number(overview.projects_completed || 0),
  activeNeeds: Number(overview.active_needs || 0),
  totalDonors: Number(overview.total_donors || 0),
});

const normalizeProject = (campaign) => {
  const isCompleted = (
    campaign.status === "CLOSED"
    || (toNumber(campaign.target_amount) > 0 && toNumber(campaign.collected_amount) >= toNumber(campaign.target_amount))
  );

  return {
    id: String(campaign.campaign_id),
    title: campaign.title,
    description: campaign.description || "Support your NCC unit through this campaign.",
    raised: toNumber(campaign.collected_amount),
    target: toNumber(campaign.target_amount),
    status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
    canClose: campaign.campaign_type !== "DEFAULT" && !isCompleted,
  };
};

export const donationApi = {
  createCampaign: async ({ title, description, minimumAmount, targetAmount }) => {
    const res = await client.post("/campaign", {
      title,
      description,
      minimum_amount: minimumAmount,
      target_amount: targetAmount || null,
    });
    return { data: normalizeProject(res.data?.data || {}) };
  },

  closeCampaign: async (campaignId) => {
    const res = await client.patch(`/campaign/${encodeURIComponent(campaignId)}/close`);
    return { data: res.data?.data || res.data };
  },

  getUnitNeeds: async () => {
    const res = await client.get("/campaigns");
    return {
      data: (res.data?.data || [])
        .map(normalizeCampaign)
        .filter((campaign) => campaign.status === "active"),
    };
  },

  getMyDonations: async () => {
    const res = await client.get("/history");
    return { data: (res.data?.data || []).map(normalizeDonation) };
  },

  getDonationById: async (donationId) => {
    const res = await client.get(`/history/${encodeURIComponent(donationId)}`);
    return { data: normalizeDonation(res.data?.data || {}) };
  },

  createDonation: async ({ needId, needTitle, amount, isAnonymous = false }) => {
    const orderRes = await client.post("/create-order", {
      campaign_id: Number(needId),
      amount,
      is_anonymous: isAnonymous,
    });

    const order = orderRes.data?.order;
    const provider = orderRes.data?.provider || order?.provider || "mock";

    if (provider === "razorpay") {
      const checkoutResult = await openRazorpayCheckout({
        order,
        campaignTitle: needTitle,
      });

      await client.post("/verify", {
        order_id: checkoutResult.razorpay_order_id,
        payment_id: checkoutResult.razorpay_payment_id,
        signature: checkoutResult.razorpay_signature,
      });
    } else {
      await client.post("/verify", { order_id: order?.order_id });
    }

    const donationRes = await client.get(`/history/${encodeURIComponent(order?.donation_id)}`);
    return { data: normalizeDonation(donationRes.data?.data || {}) };
  },

  getLeaderboard: async () => {
    const res = await client.get("/leaderboard");
    return { data: (res.data?.data || []).map(normalizeLeaderboard) };
  },

  getRecognition: async () => {
    const res = await client.get("/recognition");
    return { data: normalizeRecognition(res.data?.data || {}) };
  },

  reportIssue: async ({ donationId, issueText }) => {
    const res = await client.post(`/history/${encodeURIComponent(donationId)}/report`, {
      issue_text: issueText,
    });
    return { data: res.data?.data || res.data };
  },

  getPendingDonations: async () => ({ data: [] }),

  uploadUtilization: async () => {
    throw new Error("Utilization workflow is not available in the backend yet");
  },

  getSuoStatus: async () => ({ data: [] }),

  getAnoOverview: async () => {
    const res = await client.get("/overview");
    return { data: normalizeOverview(res.data?.data || {}) };
  },

  getAnoProjects: async () => {
    const res = await client.get("/campaigns");
    return { data: (res.data?.data || []).map(normalizeProject) };
  },

  getAnoIssueReports: async () => {
    const res = await client.get("/issues");
    return { data: res.data?.data || [] };
  },

  resolveAnoIssueReport: async ({ reportId, resolutionText }) => {
    const res = await client.patch(`/issues/${encodeURIComponent(reportId)}/resolve`, {
      resolution_text: resolutionText,
    });
    return { data: res.data?.data || res.data };
  },
};

export default donationApi;
