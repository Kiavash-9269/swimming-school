import { Link, useLocation } from "react-router-dom";





export default function Breadcrumb() {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    return (
        <div className="bg-blue-600 py-4 px-6 flex justify-center items-center ">
            
            <div className="max-w-[1100px] w-full flex justify-start">

            <Link to="/" className="text-white  border-b-2 border-b-transparent hover:border-b-2 hover:border-white transition-all duration-300">Home</Link>

            {pathnames.map((name, index) => {
                const routeTo = "/" + pathnames.slice(0, index + 1).join("/");
                const isLast = index === pathnames.length - 1;

                return (
                    <span key={name} className="flex items-center">
                        <span className="text-gray-200 mx-2">/</span>
                        {isLast ? (
                            <span className="text-gray-300 capitalize">{name}</span>
                        ) : (
                            <Link to={routeTo} className="text-white capitalize">
                                {name}
                            </Link>
                        )}
                    </span>
                );
            })}
            </div>
        </div>
    );
}
