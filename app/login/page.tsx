"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!email || !password) {
            setError("Please fill in both fields")
            return
        }

        setLoading(true)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (res.ok) {
                router.push("/dashboard")
            } else {
                setError(data.error || "Login failed")
            }
        } catch (err: any) {
            setError("Network error. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    // Neo-brutalist shared classes
    const inputClass = "w-full p-4 bg-card border-2 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] focus:outline-none focus:translate-y-1 focus:translate-x-1 focus:shadow-[0px_0px_0px_0px_var(--shadow-main)] transition-all font-satoshi font-medium text-black placeholder:text-gray-400"
    const buttonClass = "w-full p-4 bg-[#b5e550] border-2 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_0px_var(--shadow-main)] transition-all font-cabinet font-black text-black uppercase tracking-wide disabled:opacity-50"

    return (
        <div className="min-h-screen bg-page text-main flex items-center justify-center p-6 selection:bg-[#ff6b6b] selection:text-white">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#ff6b6b] blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#4dabf7] blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">

                {/* LOGO */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="bg-black text-white p-2 rounded shadow-[4px_4px_0px_0px_rgba(181,229,80,1)]">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 14l6 6 8-16" />
                        </svg>
                    </div>
                    <span className="font-cabinet font-black text-4xl tracking-tighter">POSTABLE</span>
                </div>

                {/* LOGIN CARD */}
                <div className="bg-[#fff] border-4 border-main p-8 rounded shadow-[12px_12px_0px_0px_var(--shadow-main)]">
                    <div className="mb-8">
                        <h1 className="font-cabinet font-black text-3xl mb-2">WELCOME BACK.</h1>
                        <p className="font-satoshi text-gray-600 font-medium leading-relaxed">
                            Login to access your automated publishing dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="font-cabinet font-bold uppercase text-sm tracking-wider">Email</label>
                            <input
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputClass}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="font-cabinet font-bold uppercase text-sm tracking-wider">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClass}
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-[#ff6b6b] border-2 border-main rounded text-white font-satoshi font-bold shadow-[2px_2px_0px_0px_var(--shadow-main)]">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={buttonClass}
                        >
                            {loading ? "AUTHENTICATING..." : "LOGIN TO DASHBOARD →"}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t-2 border-main/10 text-center font-satoshi font-medium text-gray-500">
                        For demonstration, any mock email and password combination will succeed and generate a unique user session.
                    </div>
                </div>
            </div>
        </div>
    )
}
