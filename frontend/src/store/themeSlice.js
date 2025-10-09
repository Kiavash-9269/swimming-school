// store/themeSlice.js
import { createSlice } from "@reduxjs/toolkit";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = localStorage.getItem("theme") || (prefersDark ? "dark" : "light");

const themeSlice = createSlice({
    name: "theme",
    initialState: {
        mode: initialTheme,
    },
    reducers: {
        toggleTheme: (state) => {
            state.mode = state.mode === "dark" ? "light" : "dark";
            localStorage.setItem("theme", state.mode);
        },
        setTheme: (state, action) => {
            state.mode = action.payload;
            localStorage.setItem("theme", state.mode);
        },
    },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
