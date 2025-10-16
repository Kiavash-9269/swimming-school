import { Link } from 'react-router-dom'
import logo from '../../public/logo.png.webp'



export default function Footer() {



    return (
        <div className="w-full flex flex-col bg-[#D6E8F1] px-5 py-10 mt-40 pb-80">

            <div className='relative w-full h-[240px]'>

                <div className="bg-[#132238] p-10 px-15 flex flex-col text-center absolute -top-20 left-0 text-white">
                    <div className="flex items-center justify-center w-full gap-x-2">
                        <Link to=''>
                            <img src={logo} alt="Iran Australia Swimming School Logo" className='h-12 w-12 transition-all duration-300 hover:scale-110 hover:rotate-6'></img>
                        </Link>
                        <h3 className='font-bold text-xl'>اسم مدرسه</h3>
                    </div>
                    <p className='text-sm text-gray-400 mt-5 leading-relaxed'>لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ، و با استفاده از طراحان گرافیک است، چاپگرها و</p>

                    <div className="flex justify-center items-center w-full mt-5 gap-x-3">

                        <a href="#" className="p-3 hover:bg-blue-500 transition-all duration-300 border border-sky-900 fill-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="white">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M23.1117 4.49449C23.4296 2.94472 21.9074 1.65683 20.4317 2.227L2.3425 9.21601C0.694517 9.85273 0.621087 12.1572 2.22518 12.8975L6.1645 14.7157L8.03849 21.2746C8.13583 21.6153 8.40618 21.8791 8.74917 21.968C9.09216 22.0568 9.45658 21.9576 9.70712 21.707L12.5938 18.8203L16.6375 21.8531C17.8113 22.7334 19.5019 22.0922 19.7967 20.6549L23.1117 4.49449ZM3.0633 11.0816L21.1525 4.0926L17.8375 20.2531L13.1 16.6999C12.7019 16.4013 12.1448 16.4409 11.7929 16.7928L10.5565 18.0292L10.928 15.9861L18.2071 8.70703C18.5614 8.35278 18.5988 7.79106 18.2947 7.39293C17.9906 6.99479 17.4389 6.88312 17.0039 7.13168L6.95124 12.876L3.0633 11.0816ZM8.17695 14.4791L8.78333 16.6015L9.01614 15.321C9.05253 15.1209 9.14908 14.9366 9.29291 14.7928L11.5128 12.573L8.17695 14.4791Z" fill="#fffff" />
                            </svg>
                        </a>

                        <a href="#" className="p-3 hover:bg-blue-500 transition-all duration-300 border border-sky-900 fill-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                        </a>

                        <a href="#" className="p-3 hover:bg-blue-500 transition-all duration-300 border border-sky-900 fill-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" /></svg>
                        </a>

                    </div>

                </div>
            </div>

            <div className='flex flex-col text-right'>
                <h3 className='mb-3 text-xl font-bold'>لینک های کاربردی</h3>
                <ul className='flex flex-col w-full'>
                    <li className='w-full'>
                        <a className='w-full p-3 flex items-center gap-x-2 transition-colors duration-300 hover:text-teal-600 cursor-pointer'>
                            <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" fill='#04b8b8' width="15" height="15"><path d="M17.17,24a1,1,0,0,1-.71-.29L8.29,15.54a5,5,0,0,1,0-7.08L16.46.29a1,1,0,1,1,1.42,1.42L9.71,9.88a3,3,0,0,0,0,4.24l8.17,8.17a1,1,0,0,1,0,1.42A1,1,0,0,1,17.17,24Z" /></svg>
                            <span>صفحه ی اصلی</span>
                        </a>
                    </li>

                    <li className='w-full'>
                        <a className='w-full p-3 flex items-center gap-x-2 transition-colors duration-300 hover:text-teal-600 cursor-pointer'>
                            <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" fill='#04b8b8' width="15" height="15"><path d="M17.17,24a1,1,0,0,1-.71-.29L8.29,15.54a5,5,0,0,1,0-7.08L16.46.29a1,1,0,1,1,1.42,1.42L9.71,9.88a3,3,0,0,0,0,4.24l8.17,8.17a1,1,0,0,1,0,1.42A1,1,0,0,1,17.17,24Z" /></svg>
                            <span>درباره ی ما</span>
                        </a>
                    </li>

                    <li className='w-full'>
                        <a className='w-full p-3 flex items-center gap-x-2 transition-colors duration-300 hover:text-teal-600 cursor-pointer'>
                            <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" fill='#04b8b8' width="15" height="15"><path d="M17.17,24a1,1,0,0,1-.71-.29L8.29,15.54a5,5,0,0,1,0-7.08L16.46.29a1,1,0,1,1,1.42,1.42L9.71,9.88a3,3,0,0,0,0,4.24l8.17,8.17a1,1,0,0,1,0,1.42A1,1,0,0,1,17.17,24Z" /></svg>
                            <span>دوره ها</span>
                        </a>
                    </li>

                    <li className='w-full'>
                        <a className='w-full p-3 flex items-center gap-x-2 transition-colors duration-300 hover:text-teal-600 cursor-pointer'>
                            <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" fill='#04b8b8' width="15" height="15"><path d="M17.17,24a1,1,0,0,1-.71-.29L8.29,15.54a5,5,0,0,1,0-7.08L16.46.29a1,1,0,1,1,1.42,1.42L9.71,9.88a3,3,0,0,0,0,4.24l8.17,8.17a1,1,0,0,1,0,1.42A1,1,0,0,1,17.17,24Z" /></svg>
                            <span>تصاویر</span>
                        </a>
                    </li>

                    <li className='w-full'>
                        <a className='w-full p-3 flex items-center gap-x-2 transition-colors duration-300 hover:text-teal-600 cursor-pointer'>
                            <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" fill='#04b8b8' width="15" height="15"><path d="M17.17,24a1,1,0,0,1-.71-.29L8.29,15.54a5,5,0,0,1,0-7.08L16.46.29a1,1,0,1,1,1.42,1.42L9.71,9.88a3,3,0,0,0,0,4.24l8.17,8.17a1,1,0,0,1,0,1.42A1,1,0,0,1,17.17,24Z" /></svg>
                            <span>ارتباط با ما</span>
                        </a>
                    </li>
                </ul>
            </div>

            {/* <div className='flex flex-col'>
                <h3>اولین نفر از اخبار ویژه مطلع شوید</h3>
                <p>با عضویت در خبرنامه، از جدیدترین تخفیف‌ها، دوره‌های آموزشی و اطلاعیه‌های مهم زودتر از سایرین باخبر شوید.</p>
                <form></form>
            </div> */}

            
        </div>
    )
}




