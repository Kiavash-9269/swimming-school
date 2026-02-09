import { Link } from "react-router-dom";
import logo from "../../public/logo.png.webp";

const socialIcons = [
    {
        href: "https://www.linkedin.com/yourprofile",
        svg: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icon-tabler-brand-linkedin"
            >
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
        href: "https://t.me/yourchannel",
        svg: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icon-tabler-brand-telegram"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" />
            </svg>
        ),
    },
    {
        href: "https://instagram.com/yourprofile",
        svg: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icon-tabler-brand-instagram"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z" />
                <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                <path d="M16.5 7.5v.01" />
            </svg>
        ),
    },
];

const linkGroups = [
    {
        title: "لینک‌های کاربردی",
        links: [
            { href: "/", label: "صفحه اصلی" },
            { href: "/about", label: "درباره ما" },
            { href: "/courses", label: "دوره‌ها" },
            { href: "/gallery", label: "تصاویر" },
            { href: "/contact", label: "ارتباط با ما" },
        ],
    },
    {
        title: "پشتیبانی و قوانین",
        links: [
            { href: "/support", label: "پشتیبانی" },
            { href: "/faq", label: "سوالات متداول" },
            { href: "/terms", label: "قوانین استفاده" },
            { href: "/privacy", label: "حریم خصوصی" },
        ],
    },
];

export default function Footer() {
    return (
        <footer className="bg-[#D6E8F1] py-8 md:py-16 flex justify-center" dir="rtl">
            <div className="w-full max-w-[1280px] px-4 md:px-6 flex flex-col items-center lg:flex-row gap-6 md:gap-10">
                {/* ----- Logo & Info ----- */}
                <div className="relative w-full lg:flex-1">
                    <div className="bg-[#132238] text-white p-6 md:p-10 md:py-12 w-full rounded-lg shadow-lg -mt-16 md:-mt-20 mb-4 md:mb-0">
                        <div className="flex flex-col md:flex-row justify-center md:justify-start items-center gap-3 md:gap-4 mb-4">
                            <img
                                src={logo}
                                alt="لوگو"
                                className="h-10 w-10 md:h-12 md:w-12 transition-transform duration-300 hover:scale-110 hover:rotate-6"
                            />
                            <h3 className="font-bold text-lg md:text-xl text-center md:text-right">
                                مدرسه شنا ایران استرالیا
                            </h3>
                        </div>

                        <p className="text-xs md:text-sm text-gray-300 leading-relaxed text-center md:text-right">
                            لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ است.
                        </p>

                        <div className="flex justify-center gap-2 md:gap-3 mt-4 md:mt-5">
                            {socialIcons.map((icon, i) => (
                                <a
                                    key={i}
                                    href={icon.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 md:p-3 border border-sky-900 rounded-md hover:bg-blue-500 transition"
                                    aria-label="لینک شبکه اجتماعی"
                                >
                                    <div className="w-5 h-5 md:w-6 md:h-6">
                                        {icon.svg}
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ----- Links & Newsletter ----- */}
                <div className="flex flex-col w-full md:flex-row gap-6 md:gap-5">
                    {/* ----- Link Groups ----- */}
                    <div className="flex flex-col sm:flex-row w-full md:w-1/2 gap-6 md:gap-12">
                        {linkGroups.map((group, i) => (
                            <div key={i} className="flex-1">
                                <h3 className="text-base md:text-lg font-bold mb-4 text-center sm:text-right">
                                    {group.title}
                                </h3>
                                <ul className="space-y-2 md:space-y-3 text-gray-600 text-sm">
                                    {group.links.map((link, j) => (
                                        <li key={j}>
                                            <Link
                                                to={link.href}
                                                className="flex items-center gap-2 hover:text-teal-600 transition justify-center sm:justify-start"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="12"
                                                    height="12"
                                                    className="w-3 h-3 md:w-4 md:h-4"
                                                    fill="#04b8b8"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M17.17,24a1,1,0,0,1-.71-.29L8.29,15.54a5,5,0,0,1,0-7.08L16.46.29a1,1,0,1,1,1.42,1.42L9.71,9.88a3,3,0,0,0,0,4.24l8.17,8.17a1,1,0,0,1,0,1.42A1,1,0,0,1,17.17,24Z" />
                                                </svg>
                                                <span className="text-xs md:text-sm">{link.label}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* ----- Newsletter ----- */}
                    <div className="w-full md:w-1/2">
                        <h3 className="text-base md:text-lg font-bold mb-4 text-center md:text-right">
                            عضویت در خبرنامه
                        </h3>
                        <p className="text-gray-600 text-xs md:text-sm leading-relaxed mb-4 text-center md:text-right">
                            با عضویت در خبرنامه، از جدیدترین تخفیف‌ها و دوره‌های آموزشی مطلع شوید.
                        </p>
                        <form className="flex flex-col sm:flex-row bg-white rounded-full overflow-hidden shadow-sm">
                            <input
                                type="email"
                                placeholder="ایمیلتان را وارد کنید"
                                className="flex-1 px-4 py-3 md:py-4 text-xs md:text-sm text-gray-600 focus:outline-none text-center sm:text-right"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-600 text-white py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-medium transition whitespace-nowrap"
                            >
                                عضویت
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </footer>
    );
}