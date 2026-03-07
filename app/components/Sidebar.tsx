"use client"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import axios from "axios"

export default function Sidebar({ isOpen, isMobile }: { isOpen: boolean, isMobile: boolean }) {
    const router = useRouter()
    const pathname = usePathname()
    const [userEmail, setUserEmail] = useState<string>("Loading...")

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await axios.get("/api/auth/me")
                if (data.user?.email) {
                    setUserEmail(data.user.email)
                } else {
                    setUserEmail("Not logged in")
                }
            } catch (err) {
                console.error("Failed to fetch user session", err)
                setUserEmail("Error")
            }
        }
        fetchUser()
    }, [])

    const handleLogout = async () => {
        try {
            await axios.post("/api/auth/logout")
            router.push("/login")
        } catch (err) {
            console.error("Logout failed", err)
        }
    }

    const navItems = [
        { href: "/", icon: "🏠", label: "Dashboard", exact: true },
        { href: "/upload", icon: "🎥", label: "Upload Video" },
        { href: "/trends", icon: "🔥", label: "Trends" },
        { href: "/analytics", icon: "📊", label: "Analytics" },
        { href: "/scheduler", icon: "📅", label: "Scheduler" },
        { href: "/settings", icon: "⚙️", label: "Settings" }
    ]

    return (
        <div
            className={`shrink-0 bg-card border-r-4 border-main transition-all duration-300 ease-in-out overflow-hidden flex flex-col z-30
            ${isMobile
                    ? `absolute top-0 bottom-0 left-0 shadow-[4px_0px_0px_0px_var(--shadow-main)] ${isOpen ? "w-64" : "w-0 border-r-0"}`
                    : `${isOpen ? "w-64" : "w-[88px]"} shadow-[4px_0px_0px_0px_var(--shadow-main)]`
                }`}
        >
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {navItems.map(item => {
                    const isActive = item.exact
                        ? pathname === item.href || (item.href === "/" && pathname === "/dashboard")
                        : pathname.startsWith(item.href)

                    return (
                        <button
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            title={isOpen ? "" : item.label}
                            className={`flex justify-center items-center px-3 py-3 border-2 border-main rounded transition-all font-cabinet font-bold uppercase tracking-wide
                            ${!isOpen && !isMobile ? "w-[48px]" : "w-full justify-start"}
                            ${isActive
                                    ? "bg-[#b5e550] text-main shadow-[inset_2px_2px_0px_0px_var(--shadow-main)] hover:bg-[#a4d440]"
                                    : "bg-card text-main shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_var(--shadow-main)]"
                                }`}
                        >
                            <span className={`text-xl ${!isOpen && !isMobile ? "w-full text-center" : "w-8 text-center"}`}>
                                {item.icon}
                            </span>
                            {(isOpen || isMobile) && (
                                <span className="ml-2 whitespace-nowrap overflow-hidden text-left flex-1">{item.label}</span>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className={`p-4 border-t-4 border-main bg-page flex flex-col gap-3 justify-center items-center overflow-hidden`}>
                {(isOpen || isMobile) ? (
                    <div className="w-full">
                        <div className="font-cabinet font-black text-main bg-card border-2 border-main p-2 rounded shadow-inner truncate text-xs mb-3 text-center" title={userEmail}>
                            {userEmail}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 bg-[#ff6b6b] border-2 border-main text-white font-cabinet font-bold uppercase px-3 py-2 rounded shadow-[3px_3px_0px_0px_var(--shadow-main)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_0px_var(--shadow-main)] transition-all"
                        >
                            <span>🚪</span> Logout
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleLogout}
                        title={`Logout (${userEmail})`}
                        className="w-[48px] h-[48px] flex items-center justify-center bg-[#ff6b6b] border-2 border-main rounded shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_var(--shadow-main)] transition-all text-white text-xl"
                    >
                        🚪
                    </button>
                )}
            </div>
        </div>
    )
}
