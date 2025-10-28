import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function AboutFeatures() {
    const features = [
        "آموزش شنا از مبتدی تا حرفه‌ای",
        "استخرهای استاندارد و ایمن",
        "تمرینات تنفسی و بدنسازی آبی",
        "مربیان دارای گواهینامه بین‌المللی",
    ];

    return (
        <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white/60 backdrop-blur-md mx-6 md:mx-20 my-12 p-8 rounded-2xl shadow-lg"
        >
            <h3 className="text-2xl font-semibold text-sky-800 mb-6 text-center">
                ویژگی‌های مدرسه ما
            </h3>
            <ul className="grid md:grid-cols-2 gap-4 text-gray-700">
                {features.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="text-sky-600 w-5 h-5" />
                        {item}
                    </li>
                ))}
            </ul>
        </motion.section>
    );
}
