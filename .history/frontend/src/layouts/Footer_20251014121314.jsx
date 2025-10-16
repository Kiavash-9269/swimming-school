import logo from '../../public/logo.png.webp'




export default function Footer() {



    return (
        <div className="w-full flex relative bg-[] px-5 py-10">

            <div className="bg-[#132238] p-5 flex flex-col text-center absolute -top-10 text-white">
                        <div className="flex items-center justify-center w-full">
                            <img src={logo} className='h-10 w-10' ></img>
                            <h3>اسم مدرسه</h3>
                        </div>
                        <p>لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ، و با استفاده از طراحان گرافیک است، چاپگرها و</p>
                        <div className="flex justify-center items-center w-full">

                        </div>
                </div>
        </div>
    )
}