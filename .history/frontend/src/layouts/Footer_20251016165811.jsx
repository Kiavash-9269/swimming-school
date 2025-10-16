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

<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" id="Linkedin--Streamline-Core" height="14" width="14">
    <desc>
        Linkedin Streamline Icon: https://streamlinehq.com
    </desc>
    <g id="linkedin--network-linkedin-professional">
        <path id="Vector" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" d="M3.57363 1.76698c0.00269 0.34578 -0.13077 0.67873 -0.37155 0.92692 -0.24077 0.24818 -0.56953 0.39167 -0.91523 0.39946 -0.34498 -0.01266 -0.67191 -0.15736 -0.91324 -0.40422 -0.24132 -0.24685 -0.378592 -0.57697 -0.383437 -0.92216 0.014997 -0.3363 0.157307 -0.65433 0.398097 -0.889597 0.24078 -0.23527 0.56202 -0.37018 0.89858 -0.377383 0.33559 0.007337 0.65569 0.142582 0.89487 0.378085 0.23918 0.235505 0.37938 0.553475 0.39191 0.888895ZM1.12875 5.44916c0 -0.76217 0.48502 -0.64339 1.1581 -0.64339 0.67309 0 1.14821 -0.11878 1.14821 0.64339v7.42374c0 0.7721 -0.48502 0.6137 -1.14821 0.6137 -0.66318 0 -1.1581 0.1584 -1.1581 -0.6137V5.44916Z" stroke-width="1"></path>
        <path id="Vector_2" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" d="M5.43451 5.44927c0 -0.42563 0.15837 -0.584 0.40583 -0.63349 0.24746 -0.0495 1.09871 0 1.39566 0 0.29695 0 0.41573 0.48501 0.40583 0.85125 0.25401 -0.3409 0.59125 -0.61092 0.97946 -0.78423 0.3882 -0.17331 0.81438 -0.2441 1.23777 -0.2056 0.41574 -0.02542 0.83224 0.03692 1.22234 0.18295 0.39 0.14603 0.7451 0.3725 1.0419 0.66469 0.2969 0.29219 0.5289 0.64356 0.6811 1.03129s0.2211 0.80314 0.2023 1.21924v5.06793c0 0.7721 -0.4751 0.6137 -1.1482 0.6137s-1.1482 0.1584 -1.1482 -0.6137V8.88399c0.0174 -0.20378 -0.0092 -0.40891 -0.0781 -0.60147 -0.0689 -0.19256 -0.1785 -0.36804 -0.3212 -0.51452s-0.31529 -0.26053 -0.506 -0.33441c-0.1907 -0.07387 -0.39507 -0.10585 -0.59923 -0.09374 -0.20321 -0.00516 -0.4052 0.0329 -0.5926 0.11167 -0.18739 0.07876 -0.35592 0.19644 -0.49442 0.34523 -0.13849 0.1488 -0.24381 0.32531 -0.30896 0.51786 -0.06515 0.19255 -0.08866 0.39675 -0.06897 0.59907V12.873c0 0.7721 -0.48502 0.6137 -1.15811 0.6137 -0.67308 0 -1.1482 0.1584 -1.1482 -0.6137V5.44927Z" stroke-width="1"></path>
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
