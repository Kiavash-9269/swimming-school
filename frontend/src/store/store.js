import { configureStore } from '@reduxjs/toolkit'

import themeReducer from "./themeSlice";
import sidebarSlice from './sidebarSlice.js'
import portfolioSlice from './portfolioSlice.js'


const store = configureStore({
  reducer: {
    theme: themeReducer,
    sidebarExistance: sidebarSlice , 
    portfolioCategories:portfolioSlice
  },
})

export default store