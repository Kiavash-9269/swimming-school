import React from "react";

export default function Footer() {
    const socialIcons = [
        {
            href: "#",
            svg: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {/* LinkedIn */}
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M8 11v5" />
                    <path d="M8 8v.01" />
                    <path d="M12 16v-5" />
                    <path d="M16 16v-3a2 2 0 1 0 -4 0" />
                    <path d="M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z" />
                </svg>
            ),
        },
        {
            href: "#",
            svg: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {/* Telegram */}
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" />
                </svg>
            ),
        },
        {
            href: "#",
            svg: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {/* Instagram */}
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z" />
                    <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                    <path d="M16.5 7.5v.01" />
                </svg>
            ),
        },
    ];

    return (
        <footer className="bg-[#0f2239] text-white py-10 px-5 rounded-2xl text-center max-w-[600px] mx-auto">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                مدرسه شنا{" "}
                <img
                    src="/assets/logo.png"
                    alt="logo"
                    className="w-8 h-8 object-contain"
                />
            </h2>
            <p className="text-gray-300 mt-2">
                لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ است.
            </p>

            {/* Social Icons */}
            <div className="flex justify-center gap-4 mt-6">
                {socialIcons.map((icon, index) => (
                    <a
                        key={index}
                        href={icon.href}
                        className="w-10 h-10 flex items-center justify-center rounded-md border border-[#1e3a5f] hover:bg-[#1e3a5f] transition-all"
                    >
                        {icon.svg}
                    </a>
                ))}
            </div>
        </footer>
    );
}
