import { motion } from "framer-motion";

import { defaultViewport, staggerContainer } from "../../utils/motionVariants";




export default function SectionWrapper({children , className="bg-stone-50"}) {


    return (

        <section className={`w-full flex justify-center py-20 px-5 ${className} dark:bg-black `}>

            <motion.div
                variants={staggerContainer}
                initial='hidden'
                whileInView='visible'
                viewport={defaultViewport}
                className="container flex flex-col items-center text-center max-w-[1280px]">
                {children}
            </motion.div>

        </section>

    )
}