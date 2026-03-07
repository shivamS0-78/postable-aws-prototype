"use client"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useDarkMode } from "./DarkModeContext"

function ThemeToggle() {
    const { darkMode, toggleDarkMode } = useDarkMode()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    if (!mounted) return <div className="w-10 h-10 shrink-0" />

    return (
        <button
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center bg-card border-2 border-main rounded-full shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_var(--shadow-main)] transition-all text-main text-xl shrink-0 z-[100]"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {darkMode ? "🌙" : "☀️"}
        </button>
    )
}

export default function TopNav({ toggleSidebar }: { toggleSidebar: () => void }) {
    const pathname = usePathname()
    const router = useRouter()

    let title = ""
    switch (true) {
        case pathname === "/" || pathname === "/dashboard": title = "DASHBOARD"; break;
        case pathname === "/upload": title = "UPLOAD VIDEO"; break;
        case pathname === "/trends": title = "TRENDS"; break;
        case pathname === "/scheduler": title = "SCHEDULER"; break;
        case pathname === "/settings": title = "SETTINGS"; break;
        case pathname.startsWith("/video/"): title = "VIDEO DETAILS"; break;
        case pathname.startsWith("/analytics/"): title = "ANALYTICS"; break;
        default: title = ""; break;
    }

    return (
        <header className="w-full bg-card border-b-4 border-main z-40 shrink-0 h-16 flex items-center px-4 shadow-[0px_4px_0px_0px_var(--shadow-main)] relative justify-between">
            <div className="flex items-center gap-3 md:gap-4 shrink-0">
                <button
                    onClick={toggleSidebar}
                    className="text-xl font-black w-10 h-10 border-2 border-main rounded shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:bg-[#b5e550] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_var(--shadow-main)] transition-all flex items-center justify-center bg-card text-black shrink-0"
                >
                    ☰
                </button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
                    <div className="w-9 h-9 bg-[#b5e550] border-2 border-main rounded shadow-[2px_2px_0px_0px_var(--shadow-main)] flex items-center justify-center font-black text-lg text-black">P</div>
                    <span className="font-black font-cabinet text-xl hidden sm:inline text-black uppercase tracking-tight">POSTABLE</span>
                </div>
            </div>

            {title && (
                <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 flex justify-end md:block md:w-auto">
                    <span className="font-black font-cabinet text-sm sm:text-lg lg:text-xl uppercase px-3 py-1.5 border-2 border-main rounded shadow-[2px_2px_0px_0px_var(--shadow-main)] bg-page text-black tracking-widest whitespace-nowrap">
                        {title}
                    </span>
                </div>
            )}
            <div className="shrink-0 flex items-center justify-end md:w-auto">
                <ThemeToggle />
            </div>
        </header>
    )
}
