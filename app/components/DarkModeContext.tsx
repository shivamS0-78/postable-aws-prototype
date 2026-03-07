"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface DarkModeContextType {
    darkMode: boolean
    toggleDarkMode: () => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false)

    useEffect(() => {
        // Load preference from localStorage or system on mount
        const saved = localStorage.getItem("postable_dark_mode")
        if (saved) {
            setDarkMode(saved === "true")
        } else {
            setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches)
        }
    }, [])

    useEffect(() => {
        // Apply class to HTML element
        if (darkMode) {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }, [darkMode])

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const next = !prev
            localStorage.setItem("postable_dark_mode", String(next))
            return next
        })
    }

    return (
        <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
            {children}
        </DarkModeContext.Provider>
    )
}

export function useDarkMode() {
    const context = useContext(DarkModeContext)
    if (context === undefined) {
        throw new Error("useDarkMode must be used within a DarkModeProvider")
    }
    return context
}
