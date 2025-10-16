import { Outlet } from "react-router-dom"

import MainNavigation from "./MainNavigation.jsx"
import Footer from './Footer.jsx'
import Sidebar from './Sidebar.jsx'
import ScrollToTop from "./ScrollToTop.jsx"

export default function RootLayout() {




    return (
        <>   
            <MainNavigation />
            <Sidebar></Sidebar>
            
            <Outlet></Outlet>
            <Footer></Footer>
        </>
    )
}