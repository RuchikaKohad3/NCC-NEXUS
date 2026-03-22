import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "../features/ui/uiSlice";
import chatReducer from "./chatSlice";
import meetingsReducer from "./meetingSlice";
import donationsReducer from "./donationSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    chat: chatReducer,
    meetings: meetingsReducer,
    donations: donationsReducer,
  },
});
