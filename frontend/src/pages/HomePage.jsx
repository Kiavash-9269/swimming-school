import React from "react"
import HomeHero from "../components/hero/HomeHero"
import HomeAbout from "../components/About/HomeAbout"

export default function HomePage() {



    return (
        <>
            <div className="w-full overflow-hidden ">
                <HomeHero />
                <HomeAbout/>
            </div>
        </>
    )
}