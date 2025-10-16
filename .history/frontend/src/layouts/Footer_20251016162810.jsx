import { Link } from "react-router-dom";
import logo from "../../public/logo.png.webp";

const socialIcons = [
    {
        href: "#",
        svg: (
            <path
                d="M23.1117 4.49449C23.4296 2.94472 21.9074 1.65683 20.4317 2.227L2.3425 9.21601C0.694517 9.85273 0.621087 12.1572 2.22518 12.8975L6.1645 14.7157L8.03849 21.2746C8.13583 21.6153 8.40618 21.8791 8.74917 21.968C9.09216 22.0568 9.45658 21.9576 9.70712 21.707L12.5938 18.8203L16.6375 21.8531C17.8113 22.7334 19.5019 22.0922 19.7967 20.6549L23.1117 4.49449Z"
            />
        ),
    },
    {
        href: "#",
        svg: (
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919z" />
        ),
    },
    {
        href: "#",
        svg: (
            <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5S0.02 4.881 0.02 3.5C0.02 2.12 1.13 1 2.5 1S4.98 2.12 4.98 3.5zM5 8H0v16h5V8zm7.982 0H8.014v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0V24h4.988V13.869C24 5.989 15.078 6.276 12.982 10.155V8z" />
        ),
    },
];

<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve" width="512" height="512">
    <g>
        <path d="M12,2.162c3.204,0,3.584,0.012,4.849,0.07c1.308,0.06,2.655,0.358,3.608,1.311c0.962,0.962,1.251,2.296,1.311,3.608   c0.058,1.265,0.07,1.645,0.07,4.849c0,3.204-0.012,3.584-0.07,4.849c-0.059,1.301-0.364,2.661-1.311,3.608   c-0.962,0.962-2.295,1.251-3.608,1.311c-1.265,0.058-1.645,0.07-4.849,0.07s-3.584-0.012-4.849-0.07   c-1.291-0.059-2.669-0.371-3.608-1.311c-0.957-0.957-1.251-2.304-1.311-3.608c-0.058-1.265-0.07-1.645-0.07-4.849   c0-3.204,0.012-3.584,0.07-4.849c0.059-1.296,0.367-2.664,1.311-3.608c0.96-0.96,2.299-1.251,3.608-1.311   C8.416,2.174,8.796,2.162,12,2.162 M12,0C8.741,0,8.332,0.014,7.052,0.072C5.197,0.157,3.355,0.673,2.014,2.014   C0.668,3.36,0.157,5.198,0.072,7.052C0.014,8.332,0,8.741,0,12c0,3.259,0.014,3.668,0.072,4.948c0.085,1.853,0.603,3.7,1.942,5.038   c1.345,1.345,3.186,1.857,5.038,1.942C8.332,23.986,8.741,24,12,24c3.259,0,3.668-0.014,4.948-0.072   c1.854-0.085,3.698-0.602,5.038-1.942c1.347-1.347,1.857-3.184,1.942-5.038C23.986,15.668,24,15.259,24,12   c0-3.259-0.014-3.668-0.072-4.948c-0.085-1.855-0.602-3.698-1.942-5.038c-1.343-1.343-3.189-1.858-5.038-1.942   C15.668,0.014,15.259,0,12,0z" />
        <path d="M12,5.838c-3.403,0-6.162,2.759-6.162,6.162c0,3.403,2.759,6.162,6.162,6.162s6.162-2.759,6.162-6.162   C18.162,8.597,15.403,5.838,12,5.838z M12,16c-2.209,0-4-1.791-4-4s1.791-4,4-4s4,1.791,4,4S14.209,16,12,16z" />
        <circle cx="18.406" cy="5.594" r="1.44" />
    </g>















</svg>

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
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        fill="white"
                                        viewBox="0 0 24 24"
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
