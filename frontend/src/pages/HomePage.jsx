import React from "react"
import HomeHero from "../components/hero/HomeHero"
import HomeAbout from "../components/About/HomeAbout"
import HomeServices from "../components/Services/HomeServices"
import HomeWhyChooseUs from "../components/WhyChooseUs/HomeWhyChooseUs"
import HomeSwimmer from "../components/swimmer/HomeSwimmer"

export default function HomePage() {



    return (
        <>
            <div className="w-full overflow-hidden ">
                <HomeHero />
                <HomeAbout/>
                <HomeServices/>
                <HomeWhyChooseUs/>
                <HomeSwimmer/>
            </div>
        </>
    )
}