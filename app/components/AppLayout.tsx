"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import TopNav from "./TopNav"
import Sidebar from "./Sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(true)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            // On mobile, default to closed. On desktop, default to open.
            setIsOpen(!mobile)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Skip rendering the AppLayout on the login page entirely
    if (pathname === "/login") {
        return <>{children}</>
    }

    return (
        <div className="flex flex-col h-screen bg-page selection:bg-[#ff6b6b] selection:text-white overflow-hidden">
            <TopNav toggleSidebar={() => setIsOpen(!isOpen)} />
            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar isOpen={isOpen} isMobile={isMobile} />

                {/* Mobile overlay backdrop */}
                {isMobile && isOpen && (
                    <div
                        className="absolute inset-0 bg-black/50 z-20 backdrop-blur-sm transition-all"
                        onClick={() => setIsOpen(false)}
                    />
                )}

                <main className="flex-1 overflow-y-auto w-full relative">
                    {children}
                </main>
            </div>
        </div>
    )
}
