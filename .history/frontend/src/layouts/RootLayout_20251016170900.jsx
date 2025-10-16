import { Outlet } from "react-router-dom"

import MainNavigation from "./MainNavigation.jsx"
import Footer from './Footer.jsx'
import Sidebar from './Sidebar.jsx'
import Auth from "../pages/AuthPaga.jsx"

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