"use client"
import { usePathname, useRouter } from "next/navigation"

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
        <header className="w-full bg-white border-b-4 border-black z-40 shrink-0 h-16 flex items-center px-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] relative justify-between">
            <div className="flex items-center gap-3 md:gap-4 shrink-0">
                <button
                    onClick={toggleSidebar}
                    className="text-xl font-black w-10 h-10 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b5e550] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center bg-white text-black shrink-0"
                >
                    ☰
                </button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
                    <div className="w-9 h-9 bg-[#b5e550] border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-black text-lg text-black">P</div>
                    <span className="font-black font-cabinet text-xl hidden sm:inline text-black uppercase tracking-tight">POSTABLE</span>
                </div>
            </div>

            {title && (
                <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 flex justify-end md:block md:w-auto">
                    <span className="font-black font-cabinet text-sm sm:text-lg lg:text-xl uppercase px-3 py-1.5 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-[#f4f4f0] text-black tracking-widest whitespace-nowrap">
                        {title}
                    </span>
                </div>
            )}
        </header>
    )
}
