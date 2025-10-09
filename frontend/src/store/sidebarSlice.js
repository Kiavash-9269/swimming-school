import { createSlice } from "@reduxjs/toolkit";



const sidebarSlice = createSlice({
    name: 'sidebar',
    initialState: { sidebar: false },
    reducers: {
        toggleSidebar(state) {
            if (state.sidebar === false) {
                state.sidebar = true
                console.log ( state.sidebar)
            }
            else {
                state.sidebar = false
                console.log(state.sidebar)

            }

        }
    }
})

export const sidebarActions = sidebarSlice.actions
export default sidebarSlice.reducer

