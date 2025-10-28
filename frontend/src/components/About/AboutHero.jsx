import { motion } from "framer-motion";

import img from '../../assets/images/file-20211202-19-26j0je.avif'

export default function AboutHero() {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-20 py-12" >
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="md:w-1/2"
            >
                <h2 className="text-2xl font-semibold text-sky-700 mb-4">
                    آموزش حرفه‌ای با بهترین مربیان
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                    در مدرسه شنای ایران استرالیا، با حضور مربیان مجرب و استخرهای استاندارد،
                    محیطی امن و پویا برای یادگیری فراهم کرده‌ایم. از دوره‌های مقدماتی تا پیشرفته،
                    همه‌ی علاقه‌مندان می‌توانند در مسیر پیشرفت شنا و تناسب اندام همراه ما باشند.
                </p>
                <button className="bg-sky-600 hover:bg-sky-700 text-white font-medium px-6 py-2 rounded-md shadow-md transition">
                    اطلاعات بیشتر
                </button>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 , delay: 0.2 }}
                
                className="md:w-1/2 flex justify-center mt-8 md:mt-0"
            >
                <div className="relative">
                    <img
                        src={img}
                        alt="Swimming school"
                        className="rounded-2xl shadow-lg w-[90%] md:w-[85%]"
                    />
                    <div className="absolute bottom-4 right-4 bg-sky-800 text-white px-5 py-3 rounded-xl text-center shadow-lg">
                        <p className="text-2xl font-bold">16+</p>
                        <p className="text-sm">سال تجربه آموزشی</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
