import { motion } from "framer-motion";
import AboutHero from "../components/about/AboutHero";
import AboutFeatures from "../components/about/AboutFeatures";

export default function AboutPage() {
    return (
        <div className="bg-gradient-to-b from-sky-100 to-sky-200 min-h-screen text-gray-800 py-10" dir="rtl">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center py-16"
            >
                <h1 className="text-4xl md:text-5xl font-bold text-sky-800 mb-4">
                    درباره مدرسه شنای ایران استرالیا
                </h1>
                <p className="text-lg max-w-2xl mx-auto text-gray-600">
                    ما بیش از ۱۶ سال است که در زمینه آموزش شنا به کودکان، نوجوانان و بزرگسالان فعالیت داریم.
                    هدف ما، ترویج فرهنگ شنا و ارتقای سلامت جسمی و روحی در جامعه است.
                </p>
            </motion.header>

            <AboutHero />

            <AboutFeatures />
        </div>
    );
}
