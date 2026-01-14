import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isMenuOpen: false,
  isAnoSidebarOpen: false,
  isCadetSidebarOpen: false,
  activeAboutCard: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleMenu(state) {
      state.isMenuOpen = !state.isMenuOpen;
    },
    closeMenu(state) {
      state.isMenuOpen = false;
    },
    toggleAnoSidebar(state) {
      state.isAnoSidebarOpen = !state.isAnoSidebarOpen;
    },
    closeAnoSidebar(state) {
      state.isAnoSidebarOpen = false;
    },
    toggleCadetSidebar(state) {
      state.isCadetSidebarOpen = !state.isCadetSidebarOpen;
    },
    closeCadetSidebar(state) {
      state.isCadetSidebarOpen = false;
    },
    openAboutCard(state, action) {
      state.activeAboutCard = action.payload;
    },
    closeAboutCard(state) {
      state.activeAboutCard = null;
    },
  },
});

export const {
  toggleMenu,
  closeMenu,
  toggleAnoSidebar,
  closeAnoSidebar,
  toggleCadetSidebar,
  closeCadetSidebar,
  openAboutCard,
  closeAboutCard,
} = uiSlice.actions;
export default uiSlice.reducer;
