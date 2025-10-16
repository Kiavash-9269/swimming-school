import { Link } from "react-router-dom";
import logo from "../../public/logo.png.webp";

const socialIcons = [
    {
        href: "#",
        svg: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-linkedin"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M8 11v5" /><path d="M8 8v.01" /><path d="M12 16v-5" /><path d="M16 16v-3a2 2 0 1 0 -4 0" /><path d="M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z" /></svg>
        ),
    },
    {
        href: "#",
        svg: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-telegram"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" /></svg>
        ),
    },
    {
        href: "#",
        svg: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-instagram"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M16.5 7.5v.01" /></svg>
        ),
    },
];


const linkGroups = [
    {
        title: "لینک‌های کاربردی",
        links: ["صفحه اصلی", "درباره ما", "دوره‌ها", "تصاویر", "ارتباط با ما"],
    },
    {
        title: "پشتیبانی و قوانین",
        links: ["پشتیبانی", "سوالات متداول", "قوانین استفاده", "حریم خصوصی"],
    },
];

export default function Footer() {
    return (
        <footer className="bg-[#D6E8F1] py-16 mt-40 flex justify-center" dir="rtl">
            <div className="w-full max-w-[1280px] px-6 flex flex-col items-center lg:flex-row gap-10">
                {/* ----- Logo & Info ----- */}
                <div className="relative lg:flex-1 text-center w-full md:max-w-[500px] h-[150px] ">
                    <div className="absolute left-1/2 -top-30 -translate-x-1/2 bg-[#132238] text-white p-10 py-12 w-full rounded-lg ">
                        <div className="flex justify-center items-center gap-2 mb-4">
                            <img
                                src={logo}
                                alt="لوگو"
                                className="h-12 w-12 transition-transform duration-300 hover:scale-110 hover:rotate-6"
                            />
                            <h3 className="font-bold text-xl">مدرسه شنا</h3>
                        </div>

                        <p className="text-sm text-gray-300 leading-relaxed">
                            لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ است.
                        </p>

                        <div className="flex justify-center gap-3 mt-5">
                            {socialIcons.map((icon, i) => (
                                <a
                                    key={i}
                                    href={icon.href}
                                    className="p-3 border border-sky-900 rounded-md hover:bg-blue-500 transition"
                                >
                                    <svg
                                        
                                    >
                                        {icon.svg}
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>


                <div className="flex flex-col md:flex-row  gap-5 ">

                    {/* ----- Link Groups ----- */}
                    <div className="flex flex-col md:flex-row md:w-1/2 md:justify-center gap-12">
                        {linkGroups.map((group, i) => (
                            <div key={i}>
                                <h3 className="text-lg font-bold mb-5">{group.title}</h3>
                                <ul className="space-y-3 text-gray-600 text-sm">
                                    {group.links.map((link, j) => (
                                        <li key={j}>
                                            <a
                                                href="#"
                                                className="flex items-center gap-2 hover:text-teal-600 transition"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="15"
                                                    height="15"
                                                    fill="#04b8b8"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M17.17,24a1,1,0,0,1-.71-.29L8.29,15.54a5,5,0,0,1,0-7.08L16.46.29a1,1,0,1,1,1.42,1.42L9.71,9.88a3,3,0,0,0,0,4.24l8.17,8.17a1,1,0,0,1,0,1.42A1,1,0,0,1,17.17,24Z" />
                                                </svg>
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>


                    {/* ----- Newsletter ----- */}
                    <div className="md:w-1/2">
                        <h3 className="text-lg font-bold mb-5">عضویت در خبرنامه</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                            با عضویت در خبرنامه، از جدیدترین تخفیف‌ها و دوره‌های آموزشی مطلع
                            شوید.
                        </p>
                        <form className="flex bg-white rounded-full overflow-hidden shadow-sm">
                            <input
                                type="email"
                                placeholder="ایمیلتان را وارد کنید"
                                className="flex-1 px-4 py-4 text-sm text-gray-600 focus:outline-none"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 text-sm font-medium"
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
