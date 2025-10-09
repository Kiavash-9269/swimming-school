import { Link } from "react-router-dom"

export default function Button({ to, onClick, className = '', type, children }) {
    const baseClass =
        "px-4 py-3 bg-blue-600 rounded-3xl text-white  hover:bg-blue-500 cursor-pointer transition-all duration-300 font-light";

    if (to) {
        return <Link to={to} className={`${baseClass} ${className}`}>{children}</Link>;
    }
    else {
        return <button type={type} onClick={onClick} className={baseClass}>{children}</button>;
    }
}
