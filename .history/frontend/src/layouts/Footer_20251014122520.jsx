import {Link} from ''
import logo from '../../public/logo.png.webp'



export default function Footer() {



    return (
        <div className="w-full flex bg-[#D6E8F1] px-5 py-10 mt-40 pb-80">

            <div className='relative w-full maxw'>

            <div className="bg-[#132238] p-10 px-15 flex flex-col text-center absolute -top-20 text-white">
                <div className="flex items-center justify-center w-full gap-x-2">
                    <img src={logo} className='h-15 w-15' ></img>
                    <link></link>
                    <h3 className='font-bold text-xl'>اسم مدرسه</h3>
                </div>
                <p className='text-sm text-gray-400 mt-5'>لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ، و با استفاده از طراحان گرافیک است، چاپگرها و</p>
                <div className="flex justify-center items-center w-full">
                    
                </div>
            </div>
            </div>
        </div>
    )
}