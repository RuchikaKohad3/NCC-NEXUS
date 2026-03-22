import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { donationApi } from "../api/donationApi";

const STORAGE_KEY = "ncc_donations";

const loadFromStorage = (key) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(data));
  } catch {}
};

/* ── Async Thunks ── */

export const fetchUnitNeeds = createAsyncThunk("donations/fetchUnitNeeds", async () => {
  try {
    const res = await donationApi.getUnitNeeds();
    return res.data;
  } catch {
    return loadFromStorage("needs") || [];
  }
});

export const fetchMyDonations = createAsyncThunk("donations/fetchMyDonations", async () => {
  try {
    const res = await donationApi.getMyDonations();
    return res.data;
  } catch {
    return loadFromStorage("myDonations") || [];
  }
});

export const fetchDonationById = createAsyncThunk("donations/fetchDonationById", async (donationId) => {
  try {
    const res = await donationApi.getDonationById(donationId);
    return res.data;
  } catch {
    return null;
  }
});

export const createDonation = createAsyncThunk("donations/createDonation", async (payload) => {
  const res = await donationApi.createDonation(payload);
  return res.data;
});

export const fetchLeaderboard = createAsyncThunk("donations/fetchLeaderboard", async () => {
  try {
    const res = await donationApi.getLeaderboard();
    return res.data;
  } catch {
    return loadFromStorage("leaderboard") || [];
  }
});

export const fetchRecognition = createAsyncThunk("donations/fetchRecognition", async () => {
  try {
    const res = await donationApi.getRecognition();
    return res.data;
  } catch {
    return loadFromStorage("recognition") || null;
  }
});

export const reportDonationIssue = createAsyncThunk("donations/reportIssue", async (payload) => {
  const res = await donationApi.reportIssue(payload);
  return res.data;
});

export const fetchPendingDonations = createAsyncThunk("donations/fetchPendingDonations", async () => {
  try {
    const res = await donationApi.getPendingDonations();
    return res.data;
  } catch {
    return loadFromStorage("pending") || [];
  }
});

export const uploadUtilization = createAsyncThunk("donations/uploadUtilization", async ({ donationId, payload, files }) => {
  const res = await donationApi.uploadUtilization(donationId, payload, files);
  return res.data;
});

export const fetchSuoStatus = createAsyncThunk("donations/fetchSuoStatus", async () => {
  try {
    const res = await donationApi.getSuoStatus();
    return res.data;
  } catch {
    return loadFromStorage("suoTracked") || [];
  }
});

export const fetchAnoOverview = createAsyncThunk("donations/fetchAnoOverview", async () => {
  try {
    const res = await donationApi.getAnoOverview();
    return res.data;
  } catch {
    return loadFromStorage("anoOverview") || null;
  }
});

export const fetchAnoProjects = createAsyncThunk("donations/fetchAnoProjects", async () => {
  try {
    const res = await donationApi.getAnoProjects();
    return res.data;
  } catch {
    return loadFromStorage("anoProjects") || [];
  }
});

/* ── Slice ── */

const donationSlice = createSlice({
  name: "donations",
  initialState: {
    unitNeeds: [],
    myDonations: [],
    currentDonation: null,
    leaderboard: [],
    recognition: null,
    pendingDonations: [],
    suoTracked: [],
    anoOverview: null,
    anoProjects: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentDonation(state) {
      state.currentDonation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnitNeeds.fulfilled, (state, action) => {
        state.unitNeeds = action.payload;
        saveToStorage("needs", action.payload);
        state.loading = false;
      })
      .addCase(fetchMyDonations.fulfilled, (state, action) => {
        state.myDonations = action.payload;
        saveToStorage("myDonations", action.payload);
        state.loading = false;
      })
      .addCase(fetchDonationById.fulfilled, (state, action) => {
        state.currentDonation = action.payload;
        state.loading = false;
      })
      .addCase(createDonation.fulfilled, (state, action) => {
        state.myDonations.unshift(action.payload);
        saveToStorage("myDonations", state.myDonations);
        state.loading = false;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload;
        saveToStorage("leaderboard", action.payload);
        state.loading = false;
      })
      .addCase(fetchRecognition.fulfilled, (state, action) => {
        state.recognition = action.payload;
        saveToStorage("recognition", action.payload);
        state.loading = false;
      })
      .addCase(fetchPendingDonations.fulfilled, (state, action) => {
        state.pendingDonations = action.payload;
        saveToStorage("pending", action.payload);
        state.loading = false;
      })
      .addCase(uploadUtilization.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchSuoStatus.fulfilled, (state, action) => {
        state.suoTracked = action.payload;
        saveToStorage("suoTracked", action.payload);
        state.loading = false;
      })
      .addCase(fetchAnoOverview.fulfilled, (state, action) => {
        state.anoOverview = action.payload;
        saveToStorage("anoOverview", action.payload);
        state.loading = false;
      })
      .addCase(fetchAnoProjects.fulfilled, (state, action) => {
        state.anoProjects = action.payload;
        saveToStorage("anoProjects", action.payload);
        state.loading = false;
      })
      .addMatcher(
        (action) => action.type.startsWith("donations/") && action.type.endsWith("/pending"),
        (state) => { state.loading = true; state.error = null; }
      )
      .addMatcher(
        (action) => action.type.startsWith("donations/") && action.type.endsWith("/rejected"),
        (state, action) => { state.loading = false; state.error = action.error.message; }
      );
  },
});

export const { clearCurrentDonation } = donationSlice.actions;
export default donationSlice.reducer;
