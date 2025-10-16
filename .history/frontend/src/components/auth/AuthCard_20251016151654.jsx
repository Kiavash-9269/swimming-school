import React, { useState } from "react";

export default function AuthCard() {
    const [isFlipped, setIsFlipped] = useState(false);

    const toggleFlip = () => setIsFlipped(!isFlipped);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="relative w-[350px] h-[420px] [transform-style:preserve-3d] duration-700"
                style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
            >
                {/* FRONT - LOGIN */}
                <div className="absolute w-full h-full bg-white rounded-2xl shadow-lg flex flex-col justify-center items-center backface-hidden">
                    <h2 className="text-2xl font-semibold mb-4">Login</h2>
                    <input type="email" placeholder="Email"
                        className="border rounded-md px-4 py-2 mb-3 w-3/4" />
                    <input type="password" placeholder="Password"
                        className="border rounded-md px-4 py-2 mb-4 w-3/4" />
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md mb-3">
                        Login
                    </button>
                    <p className="text-sm">
                        Don't have an account?{" "}
                        <button onClick={toggleFlip} className="text-blue-500 underline">
                            Sign up
                        </button>
                    </p>
                </div>

                {/* BACK - SIGNUP */}
                <div className="absolute w-full h-full bg-white rounded-2xl shadow-lg flex flex-col justify-center items-center [transform:rotateY(180deg)] backface-hidden">
                    <h2 className="text-2xl font-semibold mb-4">Sign Up</h2>
                    <input type="text" placeholder="Full Name"
                        className="border rounded-md px-4 py-2 mb-3 w-3/4" />
                    <input type="email" placeholder="Email"
                        className="border rounded-md px-4 py-2 mb-3 w-3/4" />
                    <input type="password" placeholder="Password"
                        className="border rounded-md px-4 py-2 mb-4 w-3/4" />
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md mb-3">
                        Sign Up
                    </button>
                    <p className="text-sm">
                        Already have an account?{" "}
                        <button onClick={toggleFlip} className="text-blue-500 underline">
                            Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
