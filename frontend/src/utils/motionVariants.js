
export const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.3 } }
}

export const fadeIn = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: { ease: "easeInOut", duration: 0.5 } },
}

export const defaultViewport = { once: true, margin: "-200px" };

export const hoverScale = {
    init: { scale: 1, transition: { type: 'tween', duration: 0.3, ease: "easeInOut" }},
    anim: { scale: 1.1, transition: {  duration: 0.3, ease: "easeInOut" } }
    
}
