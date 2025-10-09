



export default function SectionTitle({title , desc , className=''}){
  

    return ( 

        <div
            className='flex flex-wrap w-full text-center z-5'>
            <h3 className="w-full text-blue-600 text-3xl">{title}</h3>
            <p className={`w-full  mt-3 ${className ? className :'text-orange-700'}`}>{desc}</p>
        </div>
    )
}