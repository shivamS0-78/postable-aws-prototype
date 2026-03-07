"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { CalendarData, ScheduledItem, DayData, loadData, saveData, toKey } from "@/lib/scheduler-utils"

// ─── Types ───────────────────────────────────────────────────────────
interface Video {
    id: string
    title: string
    status: string
    createdAt: string
    viralScore: number | null
}

interface ConnectedAccount {
    platform: string
    username: string
    connectedAt: string
}

// Platform config (mirrors Settings page)
const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
    youtube: { label: "YouTube", icon: "▶", color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30" },
    instagram: { label: "Instagram", icon: "📷", color: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/30" },
    linkedin: { label: "LinkedIn", icon: "💼", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
}

// ─── Helpers ─────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
}

function getMonthGrid(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = getDaysInMonth(year, month)
    const daysInPrevMonth = getDaysInMonth(year, month - 1)
    const days: { date: Date; isCurrentMonth: boolean }[] = []
    for (let i = firstDay - 1; i >= 0; i--)
        days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false })
    for (let d = 1; d <= daysInMonth; d++)
        days.push({ date: new Date(year, month, d), isCurrentMonth: true })
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++)
        days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
    return days
}

function getWeekDays(date: Date) {
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay())
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        return d
    })
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isPast(date: Date, today: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d < t
}

// ─── Circular Time Picker ────────────────────────────────────────────
function CircularTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [mode, setMode] = useState<"hour" | "minute">("hour")
    const [h, m] = value.split(":").map(Number)
    const [period, setPeriod] = useState<"AM" | "PM">(h >= 12 ? "PM" : "AM")
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    const svgRef = useRef<SVGSVGElement>(null)
    const dragging = useRef(false)

    const getAngleFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!svgRef.current) return 0
        const rect = svgRef.current.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90
        return ((angle % 360) + 360) % 360
    }, [])

    const handleSelect = useCallback((angle: number) => {
        if (mode === "hour") {
            let hour = Math.round(angle / 30) % 12
            if (hour === 0) hour = 12
            const h24 = period === "PM" ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour)
            onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
        } else {
            let minute = Math.round(angle / 6) % 60
            // Snap to nearest 5
            minute = Math.round(minute / 5) * 5
            if (minute === 60) minute = 0
            onChange(`${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)
        }
    }, [mode, period, h, m, onChange])

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true
        handleSelect(getAngleFromEvent(e))
    }

    useEffect(() => {
        const onUp = () => {
            if (dragging.current && mode === "hour") {
                dragging.current = false
                setMode("minute")
            } else {
                dragging.current = false
            }
        }
        const onMove = (e: MouseEvent) => {
            if (dragging.current) handleSelect(getAngleFromEvent(e))
        }
        window.addEventListener("mouseup", onUp)
        window.addEventListener("mousemove", onMove)
        return () => { window.removeEventListener("mouseup", onUp); window.removeEventListener("mousemove", onMove) }
    }, [mode, getAngleFromEvent, handleSelect])

    const togglePeriod = (p: "AM" | "PM") => {
        setPeriod(p)
        const newH = p === "PM" ? (displayHour === 12 ? 12 : displayHour + 12) : (displayHour === 12 ? 0 : displayHour)
        onChange(`${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    }

    // Clock geometry
    const cx = 120, cy = 120, r = 90
    const items = mode === "hour"
        ? Array.from({ length: 12 }, (_, i) => ({ val: i + 1, angle: (i + 1) * 30 }))
        : Array.from({ length: 12 }, (_, i) => ({ val: i * 5, angle: i * 30 }))

    const selectedAngle = mode === "hour" ? displayHour * 30 : m * 6
    const handX = cx + (r - 20) * Math.sin((selectedAngle * Math.PI) / 180)
    const handY = cy - (r - 20) * Math.cos((selectedAngle * Math.PI) / 180)

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Digital display */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setMode("hour")}
                    className={`text-3xl font-black font-cabinet tabular-nums px-3 py-2 rounded border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${mode === "hour" ? "bg-[#b5e550] text-black" : "bg-white text-gray-500 hover:text-black"
                        }`}
                >
                    {String(displayHour).padStart(2, "0")}
                </button>
                <span className="text-3xl font-black font-cabinet text-black">:</span>
                <button
                    onClick={() => setMode("minute")}
                    className={`text-3xl font-black font-cabinet tabular-nums px-3 py-2 rounded border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${mode === "minute" ? "bg-[#b5e550] text-black" : "bg-white text-gray-500 hover:text-black"
                        }`}
                >
                    {String(m).padStart(2, "0")}
                </button>
                <div className="flex flex-col gap-1 ml-2">
                    <button
                        onClick={() => togglePeriod("AM")}
                        className={`text-xs font-black font-cabinet uppercase px-2 py-1 rounded border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${period === "AM" ? "bg-black text-[#b5e550]" : "bg-white text-gray-600 hover:text-black"
                            }`}
                    >AM</button>
                    <button
                        onClick={() => togglePeriod("PM")}
                        className={`text-xs font-black font-cabinet uppercase px-2 py-1 rounded border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${period === "PM" ? "bg-black text-[#b5e550]" : "bg-white text-gray-600 hover:text-black"
                            }`}
                    >PM</button>
                </div>
            </div>

            {/* Clock face */}
            <svg
                ref={svgRef}
                width="240" height="240"
                className="cursor-pointer select-none"
                onMouseDown={onMouseDown}
            >
                {/* Background circle */}
                <circle cx={cx} cy={cy} r={r + 5} fill="#f4f4f0" stroke="black" strokeWidth="4" />
                <circle cx={cx} cy={cy} r={r - 30} fill="white" stroke="black" strokeWidth="2" />

                {/* Clock hand */}
                <line
                    x1={cx} y1={cy} x2={handX} y2={handY}
                    stroke="black" strokeWidth="4" strokeLinecap="round"
                />
                <circle cx={cx} cy={cy} r="6" fill="black" />
                <circle cx={handX} cy={handY} r="16" fill="#b5e550" stroke="black" strokeWidth="2" />
                <circle cx={handX} cy={handY} r="4" fill="black" />

                {/* Numbers */}
                {items.map(({ val, angle }) => {
                    const nx = cx + (r - 20) * Math.sin((angle * Math.PI) / 180)
                    const ny = cy - (r - 20) * Math.cos((angle * Math.PI) / 180)
                    const isSelected = mode === "hour" ? val === displayHour : val === m
                    return (
                        <text
                            key={val}
                            x={nx} y={ny}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize="14" fontFamily="Satoshi, sans-serif" fontWeight={isSelected ? "900" : "700"}
                            fill={isSelected ? "black" : "rgba(0,0,0,0.5)"}
                            className="pointer-events-none"
                        >
                            {mode === "minute" ? String(val).padStart(2, "0") : val}
                        </text>
                    )
                })}

                {/* Mode label */}
                <text x={cx} y={cy + 40} textAnchor="middle" fontSize="11" fontFamily="Cabinet Grotesk" fontWeight="bold" fill="rgba(0,0,0,0.8)" className="uppercase">
                    {mode === "hour" ? "Select Hour" : "Select Minutes"}
                </text>
            </svg>
        </div>
    )
}

// ─── Component ───────────────────────────────────────────────────────
export default function SchedulerPage() {
    const router = useRouter()
    const today = useMemo(() => new Date(), [])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState<"month" | "week">("month")
    const [videos, setVideos] = useState<Video[]>([])
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
    const [calendarData, setCalendarData] = useState<CalendarData>({})
    const [noteModal, setNoteModal] = useState<{ key: string; note: string } | null>(null)
    const [scheduleModal, setScheduleModal] = useState<{
        key: string
        videoId: string
        videoTitle: string
        time: string
        platforms: string[]
        autoUpload: boolean
    } | null>(null)
    const [dragOverKey, setDragOverKey] = useState<string | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const noteRef = useRef<HTMLTextAreaElement>(null)
    const [timeError, setTimeError] = useState("")
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
    const publishingRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        setCalendarData(loadData())
        axios.get("/api/videos").then(r => setVideos(r.data.videos || [])).catch(() => { })
        axios.get("/api/connected-accounts").then(r => setConnectedAccounts(r.data.accounts || [])).catch(() => { })

        const handleUpdate = () => {
            setCalendarData(loadData())
        }
        window.addEventListener("scheduler-updated", handleUpdate)
        return () => window.removeEventListener("scheduler-updated", handleUpdate)
    }, [])

    const isInitialMount = useRef(true)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false
            return
        }
        saveData(calendarData)
    }, [calendarData])

    // Show toast helper
    const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 5000)
    }, [])
    useEffect(() => { if (noteModal && noteRef.current) noteRef.current.focus() }, [noteModal])

    // ─── Navigation ────────────────────────────────────────────────────
    const goToday = () => setCurrentDate(new Date())
    const goPrev = () => {
        const d = new Date(currentDate)
        view === "month" ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7)
        setCurrentDate(d)
    }
    const goNext = () => {
        const d = new Date(currentDate)
        view === "month" ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7)
        setCurrentDate(d)
    }

    const heading = view === "month"
        ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        : (() => {
            const week = getWeekDays(currentDate)
            const s = week[0], e = week[6]
            return s.getMonth() === e.getMonth()
                ? `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`
                : `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`
        })()

    // ─── Drag & Drop ──────────────────────────────────────────────────
    const onDragStart = (e: React.DragEvent, video: Video) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ id: video.id, title: video.title }))
        e.dataTransfer.effectAllowed = "copy"
    }

    const onDragOver = (e: React.DragEvent, key: string, pastDay: boolean) => {
        if (pastDay) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
        setDragOverKey(key)
    }

    const onDragLeave = () => setDragOverKey(null)

    const onDrop = (e: React.DragEvent, key: string, pastDay: boolean) => {
        e.preventDefault()
        setDragOverKey(null)
        if (pastDay) return
        try {
            const { id, title } = JSON.parse(e.dataTransfer.getData("application/json"))
            // Check if already scheduled that day
            const day = calendarData[key]
            if (day?.scheduled.some(s => s.videoId === id)) return
            // Open schedule modal instead of directly adding
            setScheduleModal({
                key,
                videoId: id,
                videoTitle: title,
                time: "09:00",
                platforms: connectedAccounts.map(a => a.platform),
                autoUpload: false,
            })
        } catch { }
    }

    // Check if a time is in the past for today
    const isTimePast = useCallback((key: string, time: string) => {
        const todayKey = toKey(today)
        if (key !== todayKey) return false
        const [th, tm] = time.split(":").map(Number)
        const now = new Date()
        return th < now.getHours() || (th === now.getHours() && tm <= now.getMinutes())
    }, [today])

    const confirmSchedule = () => {
        if (!scheduleModal) return
        const { key, videoId, videoTitle, time, platforms, autoUpload } = scheduleModal
        // Validate: if scheduling for today, time must be in the future
        if (isTimePast(key, time)) {
            setTimeError("This time has already passed. Please select a future time.")
            return
        }
        setTimeError("")
        setCalendarData(prev => {
            const day = prev[key] || { scheduled: [], note: "" }
            return {
                ...prev,
                [key]: {
                    ...day,
                    scheduled: [...day.scheduled, { videoId, videoTitle, time, platforms, autoUpload }],
                },
            }
        })
        setScheduleModal(null)
    }

    const removeScheduled = (key: string, videoId: string) => {
        setCalendarData(prev => {
            const day = prev[key]
            if (!day) return prev
            return { ...prev, [key]: { ...day, scheduled: day.scheduled.filter(s => s.videoId !== videoId) } }
        })
    }

    // ─── Notes ─────────────────────────────────────────────────────────
    const openNoteModal = (key: string) => {
        setNoteModal({ key, note: calendarData[key]?.note || "" })
    }
    const saveNote = () => {
        if (!noteModal) return
        setCalendarData(prev => {
            const day = prev[noteModal.key] || { scheduled: [], note: "" }
            return { ...prev, [noteModal.key]: { ...day, note: noteModal.note.trim() } }
        })
        setNoteModal(null)
    }
    const deleteNote = () => {
        if (!noteModal) return
        setCalendarData(prev => {
            const day = prev[noteModal.key]
            if (!day) return prev
            return { ...prev, [noteModal.key]: { ...day, note: "" } }
        })
        setNoteModal(null)
    }

    // ─── Filtered videos ──────────────────────────────────────────────
    const filteredVideos = videos.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // ─── Day Cell ──────────────────────────────────────────────────────
    const renderDayCell = (date: Date, isCurrentMonth: boolean) => {
        const key = toKey(date)
        const isToday = isSameDay(date, today)
        const pastDay = isPast(date, today)
        const data = calendarData[key]
        const isDragTarget = dragOverKey === key

        return (
            <div
                key={key}
                onDragOver={e => onDragOver(e, key, pastDay)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, key, pastDay)}
                className={`
          group relative border-2 border-black rounded transition-all duration-200
          ${view === "week" ? "min-h-[220px]" : "min-h-[110px]"}
          ${pastDay
                        ? "bg-gray-200 border-gray-400 opacity-50 cursor-not-allowed"
                        : isCurrentMonth
                            ? "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            : "bg-[#f4f4f0] opacity-70"
                    }
          ${!pastDay && isDragTarget ? "!bg-[#b5e550] !border-black scale-[1.02] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] !opacity-100" : ""}
          ${!pastDay && !isDragTarget && isCurrentMonth ? "hover:bg-[#f4f4f0] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : ""}
          ${isToday ? "!border-4 !border-black bg-yellow-50 !opacity-100" : ""}
        `}
            >
                {/* Day number + actions */}
                <div className="flex items-center justify-between mb-2 p-1 border-b-2 border-black/10">
                    <span className={`text-sm font-cabinet font-black w-6 h-6 flex items-center justify-center rounded border-2 border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
            ${isToday ? "bg-[#ff6b6b] text-white" : pastDay ? "text-gray-500 bg-gray-200 border-gray-400" : isCurrentMonth ? "text-black" : "text-gray-400"}`}
                    >
                        {date.getDate()}
                    </span>
                    {!pastDay && (
                        <button
                            onClick={() => openNoteModal(key)}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded border-2 border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b5e550] text-black font-cabinet font-black transition-all"
                            title="Add note"
                        >
                            +
                        </button>
                    )}
                </div>

                {/* Past day overlay label */}
                {pastDay && !data?.scheduled.length && !data?.note && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[9px] text-gray-700 font-medium uppercase tracking-wider">Past</span>
                    </div>
                )}

                {/* Scheduled videos */}
                {data?.scheduled.map(item => (
                    <div
                        key={item.videoId}
                        className="group/item flex flex-col gap-1 bg-white border-2 border-black rounded px-2 py-1.5 mb-2 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="text-black text-xs">🎬</span>
                            <span className="truncate flex-1 text-xs font-cabinet font-black text-black uppercase">{item.videoTitle}</span>
                            {(!pastDay || item.publishStatus) && (
                                <button
                                    onClick={() => removeScheduled(key, item.videoId)}
                                    className="opacity-0 group-hover/item:opacity-100 bg-[#ff6b6b] text-white border-2 border-black w-4 h-4 rounded-sm flex items-center justify-center transition-all text-[8px] shrink-0 hover:scale-110"
                                    title="Remove from calendar"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 bg-[#f4f4f0] p-1 border border-black rounded flex-wrap mt-2">
                            <span className="text-[10px] font-cabinet font-black text-black border-r border-black pr-1">⏰ {item.time || "09:00"}</span>
                            {item.autoUpload && !item.publishStatus && (
                                <span className="text-[9px] font-cabinet font-bold uppercase bg-[#b5e550] text-black px-1 border border-black rounded">AUTO</span>
                            )}
                            {item.publishStatus === "publishing" && (
                                <span className="text-[9px] font-cabinet font-bold uppercase bg-[#4dabf7] text-white px-1 border border-black rounded animate-pulse">PUBLISHING...</span>
                            )}
                            {item.publishStatus === "published" && (
                                <span className="text-[9px] font-cabinet font-bold uppercase bg-[#b5e550] text-black px-1 border border-black rounded">✅ PUBLISHED</span>
                            )}
                            {item.publishStatus === "failed" && (
                                <span className="text-[9px] font-cabinet font-bold uppercase bg-[#ff6b6b] text-white px-1 border border-black rounded" title={item.publishMessage}>❌ FAILED</span>
                            )}
                            {item.platforms?.map(p => (
                                <span key={p} className={`text-[10px]`} title={PLATFORM_CONFIG[p]?.label}>
                                    {PLATFORM_CONFIG[p]?.icon || p}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Note */}
                {data?.note && (
                    <div
                        onClick={() => !pastDay && openNoteModal(key)}
                        className={`flex items-start gap-1 bg-[#f4f4f0] border-2 border-black border-dashed rounded px-2 py-1 mt-1 ${pastDay ? "" : "cursor-pointer hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"} transition-all`}
                    >
                        <span className="text-black text-xs shrink-0 pt-0.5">📝</span>
                        <span className="text-[11px] font-cabinet font-bold text-black line-clamp-2 leading-tight uppercase">{data.note}</span>
                    </div>
                )}

                {/* Drop indicator */}
                {isDragTarget && !pastDay && (
                    <div className="absolute inset-0 flex items-center justify-center rounded pointer-events-none">
                        <div className="bg-[#b5e550] border-4 border-black border-dashed rounded px-3 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <span className="text-black text-xs font-cabinet font-black uppercase">DROP HERE</span>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ─── Render ────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#f4f4f0] text-black font-satoshi selection:bg-[#ff6b6b] selection:text-white pb-32">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[60] max-w-md px-6 py-4 border-4 border-black text-black font-cabinet font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all animate-in slide-in-from-right ${toast.type === "success" ? "bg-[#b5e550]"
                    : toast.type === "error" ? "bg-[#ff6b6b] text-white"
                        : "bg-[#4dabf7] text-white"
                    }`}>
                    {toast.message}
                </div>
            )}

            <div className="max-w-[1400px] mx-auto px-6 py-8">
                <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-4">
                    <span className="text-4xl">📅</span>
                    <h1 className="text-4xl font-black font-cabinet uppercase tracking-wide">Scheduler</h1>
                </div>

                <div className="flex flex-col xl:flex-row gap-6">
                    {/* ─── Main Calendar ───────────────────────────────── */}
                    <div className="flex-1 min-w-0">
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white border-4 border-black p-4 rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto">
                                <div className="flex bg-white border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0">
                                    <button onClick={goPrev} className="w-10 h-10 flex items-center justify-center font-cabinet font-black text-xl hover:bg-[#b5e550] border-r-2 border-black transition-colors">‹</button>
                                    <button onClick={goNext} className="w-10 h-10 flex items-center justify-center font-cabinet font-black text-xl hover:bg-[#4dabf7] transition-colors">›</button>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-cabinet font-black uppercase text-black whitespace-nowrap">{heading}</h2>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                                <button onClick={goToday} className="px-3 sm:px-4 py-2 font-cabinet font-black uppercase border-2 border-black rounded bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ff6b6b] hover:text-white transition-all text-xs sm:text-base">Today</button>
                                <div className="flex bg-[#f4f4f0] border-2 border-black rounded p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                                    <button onClick={() => setView("month")} className={`px-2 sm:px-4 py-1 font-cabinet font-black uppercase rounded border-2 border-transparent transition-all text-xs sm:text-base ${view === "month" ? "bg-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-gray-500 hover:text-black"}`}>Month</button>
                                    <button onClick={() => setView("week")} className={`px-2 sm:px-4 py-1 font-cabinet font-black uppercase rounded border-2 border-transparent transition-all text-xs sm:text-base ${view === "week" ? "bg-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-gray-500 hover:text-black"}`}>Week</button>
                                </div>
                                <button onClick={() => setSidebarOpen(p => !p)} className={`px-3 sm:px-4 py-2 font-cabinet font-black uppercase border-2 border-black rounded transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 text-xs sm:text-base ${sidebarOpen ? "bg-[#b5e550] text-black" : "bg-white text-black"}`}>🎬 Videos</button>
                            </div>
                        </div>

                        {/* Calendar Grid Wrapper */}
                        <div className="overflow-x-auto pb-4 -mx-6 px-6 xl:mx-0 xl:px-0">
                            <div className="min-w-[700px] xl:min-w-0">
                                {/* Day headers */}
                                <div className="grid grid-cols-7 mb-2">
                                    {DAYS_SHORT.map(d => (
                                        <div key={d} className="text-center font-cabinet font-black text-black uppercase tracking-wider py-2 bg-white border-2 border-black mx-1 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{d}</div>
                                    ))}
                                </div>

                                {/* Month view */}
                                {view === "month" && (
                                    <div className="grid grid-cols-7 gap-1">
                                        {getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()).map(({ date, isCurrentMonth }) =>
                                            renderDayCell(date, isCurrentMonth)
                                        )}
                                    </div>
                                )}

                                {/* Week view */}
                                {view === "week" && (
                                    <div className="grid grid-cols-7 gap-1">
                                        {getWeekDays(currentDate).map(date => renderDayCell(date, true))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-6 mt-6 text-sm font-cabinet font-bold text-black uppercase">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-black rounded bg-[#ff6b6b]" /> Today</div>
                            <div className="flex items-center gap-2"><span className="text-black text-lg">🎬</span> Scheduled</div>
                            <div className="flex items-center gap-2"><span className="text-black text-lg">📝</span> Note</div>
                            <div className="flex items-center gap-2"><span className="text-[10px] bg-[#b5e550] text-black px-1.5 py-0.5 border-2 border-black rounded">AUTO</span> Auto-Upload</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-black bg-gray-200 opacity-50 rounded" /> Past (locked)</div>
                        </div>
                    </div>

                    {/* ─── Video Sidebar ──────────────────────────────── */}
                    {sidebarOpen && (
                        <div className="w-full xl:w-80 shrink-0">
                            <div className="sticky top-6">
                                <div className="bg-white border-4 border-black rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                    <div className="px-5 py-4 border-b-4 border-black">
                                        <h3 className="text-lg font-cabinet font-black uppercase text-black mb-3">Videos</h3>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="SEARCH VIDEOS..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full bg-white border-2 border-black rounded pl-9 pr-3 py-2 text-sm font-cabinet font-bold placeholder:text-gray-400 focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
                                        </div>
                                    </div>
                                    <div className="p-4 max-h-[calc(100vh-320px)] overflow-y-auto space-y-3">
                                        {filteredVideos.length === 0 ? (
                                            <div className="text-center py-10">
                                                <div className="text-4xl mb-3">🎬</div>
                                                <p className="font-cabinet font-bold uppercase text-sm text-gray-500 px-4">{videos.length === 0 ? "No videos uploaded yet" : "No match"}</p>
                                            </div>
                                        ) : (
                                            filteredVideos.map(video => (
                                                <div
                                                    key={video.id}
                                                    draggable
                                                    onDragStart={e => onDragStart(e, video)}
                                                    className="flex items-center gap-3 px-3 py-3 border-2 border-black rounded bg-white hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-grab active:cursor-grabbing transition-all group"
                                                >
                                                    <div className="w-10 h-10 border-2 border-black bg-[#b5e550] rounded flex items-center justify-center text-xl shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🎬</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-cabinet font-black uppercase text-black truncate">{video.title}</p>
                                                        <p className="text-[10px] font-satoshi font-bold text-gray-500">
                                                            {new Date(video.createdAt).toLocaleDateString()}
                                                            {video.viralScore && (
                                                                <span className={`ml-2 inline-block px-1 border border-black rounded bg-[#f4f4f0] text-black`}>
                                                                    🔥 {video.viralScore}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-gray-400 font-cabinet font-black group-hover:text-black">⣿</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="px-5 py-4 border-t-4 border-black">
                                        <p className="text-xs font-cabinet font-black text-black uppercase mb-3">Connected Platforms</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {connectedAccounts.length === 0 ? (
                                                <p className="text-xs font-cabinet font-bold uppercase text-gray-500">None — <span onClick={() => router.push("/settings")} className="text-blue-500 cursor-pointer hover:underline border-l-2 border-gray-300 pl-2 ml-1">connect in Settings</span></p>
                                            ) : (
                                                connectedAccounts.map(a => (
                                                    <span key={a.platform} className={`text-[10px] px-2 py-1 uppercase font-cabinet font-bold rounded border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white text-black flex items-center gap-1`}>
                                                        {PLATFORM_CONFIG[a.platform]?.icon} {a.username}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-5 py-3 border-t-4 border-black bg-[#f4f4f0] text-center">
                                        <p className="text-xs font-cabinet font-bold uppercase text-black">Drag videos onto dates to schedule</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Schedule Modal ──────────────────────────────── */}
            {scheduleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setScheduleModal(null)}>
                    <div className="bg-white border-4 border-black rounded w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b-4 border-black flex items-center justify-between shrink-0 bg-[#f4f4f0]">
                            <div>
                                <h3 className="text-xl font-cabinet font-black uppercase text-black">📅 Schedule Video</h3>
                                <p className="text-xs font-satoshi font-bold text-gray-500 mt-1 uppercase">
                                    {(() => {
                                        const [y, m, d] = scheduleModal.key.split("-").map(Number)
                                        return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                                    })()}
                                </p>
                            </div>
                            <button onClick={() => setScheduleModal(null)} className="w-8 h-8 rounded border-2 border-black flex items-center justify-center font-cabinet font-black hover:bg-[#ff6b6b] hover:text-white transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">✕</button>
                        </div>

                        <div className="p-6 space-y-8 overflow-y-auto">
                            {/* Video info */}
                            <div className="flex items-center gap-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded p-4">
                                <div className="w-12 h-12 border-2 border-black bg-[#4dabf7] rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl">🎬</div>
                                <div>
                                    <p className="text-lg font-cabinet font-black uppercase text-black">{scheduleModal.videoTitle}</p>
                                    <p className="text-xs font-satoshi font-bold text-gray-500 uppercase">Will be scheduled for upload</p>
                                </div>
                            </div>

                            {/* Circular Time picker */}
                            <div>
                                <label className="block text-xs font-cabinet font-bold uppercase text-black mb-2">Upload Time</label>
                                <CircularTimePicker
                                    value={scheduleModal.time}
                                    onChange={(t) => {
                                        setScheduleModal({ ...scheduleModal, time: t })
                                        if (timeError) setTimeError("")
                                    }}
                                />
                                {timeError && (
                                    <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-[11px] text-red-400 flex items-center gap-2">
                                        <span>❌</span> {timeError}
                                    </div>
                                )}
                            </div>

                            {/* Platform selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-2">Upload to Platforms</label>
                                {connectedAccounts.length === 0 ? (
                                    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
                                        <p className="text-xs text-gray-400 mb-2">No platforms connected yet</p>
                                        <button onClick={() => router.push("/settings")} className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">
                                            Connect in Settings →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {connectedAccounts.map(account => {
                                            const cfg = PLATFORM_CONFIG[account.platform]
                                            const selected = scheduleModal.platforms.includes(account.platform)
                                            return (
                                                <button
                                                    key={account.platform}
                                                    onClick={() => {
                                                        setScheduleModal(prev => {
                                                            if (!prev) return prev
                                                            const platforms = selected
                                                                ? prev.platforms.filter(p => p !== account.platform)
                                                                : [...prev.platforms, account.platform]
                                                            return { ...prev, platforms }
                                                        })
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${selected
                                                        ? `${cfg?.bg || "bg-gray-700"} ${cfg?.border || "border-gray-600"} ring-1 ring-purple-500/20`
                                                        : "bg-gray-800/40 border-gray-700 hover:border-gray-600"
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${selected ? cfg?.bg || "bg-gray-700" : "bg-gray-700/50"}`}>
                                                        {cfg?.icon || "📱"}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-xs font-medium ${selected ? cfg?.color || "text-white" : "text-gray-300"}`}>
                                                            {cfg?.label || account.platform}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">@{account.username}</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selected ? "bg-purple-600 border-purple-600" : "border-gray-600"
                                                        }`}>
                                                        {selected && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Auto-upload toggle */}
                            <div
                                onClick={() => setScheduleModal(prev => prev ? { ...prev, autoUpload: !prev.autoUpload } : prev)}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${scheduleModal.autoUpload
                                    ? "bg-green-500/10 border-green-500/30"
                                    : "bg-gray-800/40 border-gray-700 hover:border-gray-600"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${scheduleModal.autoUpload ? "bg-green-500/20" : "bg-gray-700/50"}`}>
                                        🚀
                                    </div>
                                    <div>
                                        <p className={`text-xs font-medium ${scheduleModal.autoUpload ? "text-green-300" : "text-gray-300"}`}>Auto-Upload</p>
                                        <p className="text-[10px] text-gray-500">Automatically upload at scheduled time</p>
                                    </div>
                                </div>
                                <div className={`w-10 h-5 rounded-full transition-all relative ${scheduleModal.autoUpload ? "bg-green-600" : "bg-gray-700"}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${scheduleModal.autoUpload ? "left-5.5" : "left-0.5"}`}
                                        style={{ left: scheduleModal.autoUpload ? "22px" : "2px" }}
                                    />
                                </div>
                            </div>

                            {scheduleModal.autoUpload && scheduleModal.platforms.length === 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-[11px] text-amber-300 flex items-center gap-2">
                                    <span>⚠️</span> Select at least one platform for auto-upload
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-end gap-2">
                            <button onClick={() => setScheduleModal(null)} className="text-xs px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-all">Cancel</button>
                            <button
                                onClick={confirmSchedule}
                                disabled={(scheduleModal.autoUpload && scheduleModal.platforms.length === 0) || !!timeError}
                                className="text-xs px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium transition-colors shadow-lg shadow-purple-500/20"
                            >
                                Schedule {scheduleModal.autoUpload ? "& Auto-Upload" : ""}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Note Modal ──────────────────────────────────── */}
            {noteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setNoteModal(null)}>
                    <div className="bg-white border-4 border-black rounded w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b-4 border-black flex items-center justify-between bg-[#f4f4f0]">
                            <div>
                                <h3 className="text-xl font-cabinet font-black uppercase text-black">📝 Note</h3>
                                <p className="text-xs font-satoshi font-bold text-gray-500 mt-1 uppercase">
                                    {(() => {
                                        const [y, m, d] = noteModal.key.split("-").map(Number)
                                        return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                                    })()}
                                </p>
                            </div>
                            <button onClick={() => setNoteModal(null)} className="w-8 h-8 rounded border-2 border-black flex items-center justify-center font-cabinet font-black hover:bg-[#ff6b6b] hover:text-white transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">✕</button>
                        </div>
                        <div className="p-6">
                            <textarea
                                ref={noteRef}
                                rows={5}
                                value={noteModal.note}
                                onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
                                placeholder="WRITE YOUR NOTE HERE..."
                                className="w-full bg-white border-4 border-black rounded p-4 text-black font-satoshi font-bold placeholder:text-gray-400 focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] resize-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            />
                        </div>
                        <div className="px-6 py-4 border-t-4 border-black flex items-center justify-between bg-[#f4f4f0]">
                            {calendarData[noteModal.key]?.note ? (
                                <button onClick={deleteNote} className="px-3 py-2 font-cabinet font-black uppercase text-[#ff6b6b] hover:text-white hover:bg-[#ff6b6b] border-2 border-transparent hover:border-black rounded transition-all">Delete note</button>
                            ) : <div />}
                            <div className="flex gap-3">
                                <button onClick={() => setNoteModal(null)} className="px-4 py-2 font-cabinet font-black uppercase border-2 border-black rounded bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">Cancel</button>
                                <button onClick={saveNote} className="px-4 py-2 font-cabinet font-black uppercase border-2 border-black rounded bg-[#b5e550] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">Save Note</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
