import { configureStore } from "@reduxjs/toolkit";

import themeReducer from "./themeSlice";
import sidebarSlice from "./sidebarSlice.js";

/**
 * Redux is present but NOT wired in main.jsx (no Provider).
 * Auth lives in AuthProvider/Context — keep that as auth source of truth until F2/F3.
 * portfolioSlice was referenced but never existed; removed in Phase F1 audit.
 */
const store = configureStore({
  reducer: {
    theme: themeReducer,
    sidebarExistance: sidebarSlice,
  },
});

export default store;
