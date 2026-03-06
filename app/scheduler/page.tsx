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
        <div className="flex flex-col items-center gap-3">
            {/* Digital display */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setMode("hour")}
                    className={`text-2xl font-bold tabular-nums px-2 py-1 rounded-lg transition-all ${mode === "hour" ? "bg-purple-600/30 text-purple-300" : "text-gray-400 hover:text-white"
                        }`}
                >
                    {String(displayHour).padStart(2, "0")}
                </button>
                <span className="text-2xl font-bold text-gray-500">:</span>
                <button
                    onClick={() => setMode("minute")}
                    className={`text-2xl font-bold tabular-nums px-2 py-1 rounded-lg transition-all ${mode === "minute" ? "bg-purple-600/30 text-purple-300" : "text-gray-400 hover:text-white"
                        }`}
                >
                    {String(m).padStart(2, "0")}
                </button>
                <div className="flex flex-col gap-0.5 ml-2">
                    <button
                        onClick={() => togglePeriod("AM")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${period === "AM" ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300"
                            }`}
                    >AM</button>
                    <button
                        onClick={() => togglePeriod("PM")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${period === "PM" ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300"
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
                <circle cx={cx} cy={cy} r={r + 5} fill="rgba(17,17,34,0.8)" stroke="rgba(139,92,246,0.15)" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={r - 30} fill="rgba(17,17,34,0.4)" stroke="rgba(139,92,246,0.08)" strokeWidth="1" />

                {/* Clock hand */}
                <line
                    x1={cx} y1={cy} x2={handX} y2={handY}
                    stroke="rgb(147,51,234)" strokeWidth="2" strokeLinecap="round"
                />
                <circle cx={cx} cy={cy} r="4" fill="rgb(147,51,234)" />
                <circle cx={handX} cy={handY} r="16" fill="rgb(147,51,234)" opacity="0.2" />
                <circle cx={handX} cy={handY} r="4" fill="rgb(147,51,234)" />

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
                            fontSize="12" fontWeight={isSelected ? "700" : "500"}
                            fill={isSelected ? "white" : "rgba(156,163,175,0.8)"}
                            className="pointer-events-none"
                        >
                            {mode === "minute" ? String(val).padStart(2, "0") : val}
                        </text>
                    )
                })}

                {/* Mode label */}
                <text x={cx} y={cy + 40} textAnchor="middle" fontSize="10" fill="rgba(107,114,128,0.6)">
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
          group relative border rounded-xl p-2 transition-all duration-200
          ${view === "week" ? "min-h-[220px]" : "min-h-[110px]"}
          ${pastDay
                        ? "bg-gray-900/10 border-white/[0.02] opacity-35 cursor-not-allowed"
                        : isCurrentMonth
                            ? "bg-gray-900/40 border-white/[0.04]"
                            : "bg-gray-900/15 border-white/[0.02] opacity-40"
                    }
          ${!pastDay && isDragTarget ? "!bg-purple-500/15 !border-purple-500/60 ring-1 ring-purple-500/30 scale-[1.02] !opacity-100" : ""}
          ${!pastDay && !isDragTarget && isCurrentMonth ? "hover:bg-gray-800/50 hover:border-white/10" : ""}
          ${isToday ? "!border-purple-500/50 ring-1 ring-purple-500/20 !opacity-100" : ""}
        `}
            >
                {/* Day number + actions */}
                <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
            ${isToday ? "bg-purple-600 text-white" : pastDay ? "text-gray-600" : isCurrentMonth ? "text-gray-300" : "text-gray-600"}`}
                    >
                        {date.getDate()}
                    </span>
                    {!pastDay && (
                        <button
                            onClick={() => openNoteModal(key)}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md bg-gray-700/60 hover:bg-purple-600 text-gray-400 hover:text-white text-[10px] transition-all"
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
                        className="group/item flex flex-col gap-0.5 bg-purple-600/15 border border-purple-500/20 rounded-lg px-2 py-1.5 mb-1 hover:bg-purple-600/25 transition-colors"
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="text-purple-400 text-[10px]">🎬</span>
                            <span className="truncate flex-1 text-[11px] font-medium text-purple-200">{item.videoTitle}</span>
                            {(!pastDay || item.publishStatus) && (
                                <button
                                    onClick={() => removeScheduled(key, item.videoId)}
                                    className="opacity-0 group-hover/item:opacity-100 text-purple-400 hover:text-red-400 transition-all text-[10px] shrink-0"
                                    title="Remove from calendar"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-gray-400">⏰ {item.time || "09:00"}</span>
                            {item.autoUpload && !item.publishStatus && (
                                <span className="text-[8px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full border border-green-500/20">AUTO</span>
                            )}
                            {item.publishStatus === "publishing" && (
                                <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-500/20 animate-pulse">PUBLISHING...</span>
                            )}
                            {item.publishStatus === "published" && (
                                <span className="text-[8px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full border border-green-500/20">✅ PUBLISHED</span>
                            )}
                            {item.publishStatus === "failed" && (
                                <span className="text-[8px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full border border-red-500/20" title={item.publishMessage}>❌ FAILED</span>
                            )}
                            {item.platforms?.map(p => (
                                <span key={p} className={`text-[9px] ${PLATFORM_CONFIG[p]?.color || "text-gray-400"}`}>
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
                        className={`flex items-start gap-1 bg-amber-500/10 border border-amber-500/15 rounded-lg px-2 py-1 mt-0.5 ${pastDay ? "" : "cursor-pointer hover:bg-amber-500/20"} transition-colors`}
                    >
                        <span className="text-amber-400 text-[10px] mt-0.5 shrink-0">📝</span>
                        <span className="text-[10px] text-amber-200/80 line-clamp-2 leading-tight">{data.note}</span>
                    </div>
                )}

                {/* Drop indicator */}
                {isDragTarget && !pastDay && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none">
                        <div className="bg-purple-600/20 border-2 border-dashed border-purple-400/50 rounded-lg px-3 py-1.5">
                            <span className="text-purple-300 text-xs font-medium">Drop here</span>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ─── Render ────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[60] max-w-md px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl transition-all animate-in slide-in-from-right ${toast.type === "success" ? "bg-green-900/90 border-green-600 text-green-200"
                    : toast.type === "error" ? "bg-red-900/90 border-red-600 text-red-200"
                        : "bg-blue-900/90 border-blue-600 text-blue-200"
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm transition-colors">← Back</button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-xs">📅</div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Scheduler</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-6 flex gap-6">
                {/* ─── Main Calendar ───────────────────────────────── */}
                <div className="flex-1 min-w-0">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <button onClick={goPrev} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/60 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition-all text-sm">‹</button>
                            <button onClick={goNext} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/60 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition-all text-sm">›</button>
                            <h2 className="text-lg font-semibold text-white ml-1">{heading}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={goToday} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-all">Today</button>
                            <div className="flex bg-gray-800/60 border border-gray-700 rounded-lg p-0.5">
                                <button onClick={() => setView("month")} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${view === "month" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-400 hover:text-white"}`}>Month</button>
                                <button onClick={() => setView("week")} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${view === "week" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-400 hover:text-white"}`}>Week</button>
                            </div>
                            <button onClick={() => setSidebarOpen(p => !p)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${sidebarOpen ? "bg-purple-600/20 border-purple-500/30 text-purple-300" : "bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white"}`}>🎬 Videos</button>
                        </div>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {DAYS_SHORT.map(d => (
                            <div key={d} className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider py-1">{d}</div>
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

                    {/* Legend */}
                    <div className="flex items-center gap-5 mt-4 text-[10px] text-gray-500">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Today</div>
                        <div className="flex items-center gap-1.5"><span className="text-purple-400">🎬</span> Scheduled</div>
                        <div className="flex items-center gap-1.5"><span className="text-amber-400">📝</span> Note</div>
                        <div className="flex items-center gap-1.5"><span className="text-[8px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full border border-green-500/20">AUTO</span> Auto-Upload</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-800 border border-gray-700" /> Past (locked)</div>
                    </div>
                </div>

                {/* ─── Video Sidebar ──────────────────────────────── */}
                {sidebarOpen && (
                    <div className="w-72 shrink-0">
                        <div className="sticky top-6">
                            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                                <div className="px-4 py-3 border-b border-gray-800">
                                    <h3 className="text-sm font-semibold text-gray-200 mb-2">Videos</h3>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search videos..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                                        />
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">🔍</span>
                                    </div>
                                </div>
                                <div className="p-3 max-h-[calc(100vh-280px)] overflow-y-auto space-y-1.5">
                                    {filteredVideos.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="text-3xl mb-2">🎬</div>
                                            <p className="text-gray-500 text-xs">{videos.length === 0 ? "No videos uploaded yet" : "No match"}</p>
                                        </div>
                                    ) : (
                                        filteredVideos.map(video => (
                                            <div
                                                key={video.id}
                                                draggable
                                                onDragStart={e => onDragStart(e, video)}
                                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-800/40 border border-transparent hover:border-purple-500/25 hover:bg-gray-800/70 cursor-grab active:cursor-grabbing transition-all group"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/15 flex items-center justify-center text-sm shrink-0">🎬</div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-gray-200 truncate">{video.title}</p>
                                                    <p className="text-[10px] text-gray-500">
                                                        {new Date(video.createdAt).toLocaleDateString()}
                                                        {video.viralScore && (
                                                            <span className={`ml-1.5 ${video.viralScore >= 70 ? "text-green-400" : video.viralScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                                                                🔥 {video.viralScore}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <svg className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                </svg>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {/* Connected accounts summary */}
                                <div className="px-4 py-2.5 border-t border-gray-800">
                                    <p className="text-[10px] text-gray-500 mb-1.5">Connected Platforms</p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {connectedAccounts.length === 0 ? (
                                            <p className="text-[10px] text-gray-600">None — <span onClick={() => router.push("/settings")} className="text-purple-400 cursor-pointer hover:underline">connect in Settings</span></p>
                                        ) : (
                                            connectedAccounts.map(a => (
                                                <span key={a.platform} className={`text-[10px] px-2 py-0.5 rounded-full border ${PLATFORM_CONFIG[a.platform]?.bg || "bg-gray-700"} ${PLATFORM_CONFIG[a.platform]?.border || "border-gray-600"} ${PLATFORM_CONFIG[a.platform]?.color || "text-gray-300"}`}>
                                                    {PLATFORM_CONFIG[a.platform]?.icon} {a.username}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="px-4 py-2.5 border-t border-gray-800 text-center">
                                    <p className="text-[10px] text-gray-500">Drag videos onto future dates to schedule</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Schedule Modal ──────────────────────────────── */}
            {scheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setScheduleModal(null)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">📅 Schedule Video</h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    {(() => {
                                        const [y, m, d] = scheduleModal.key.split("-").map(Number)
                                        return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                                    })()}
                                </p>
                            </div>
                            <button onClick={() => setScheduleModal(null)} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Video info */}
                            <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/15 flex items-center justify-center">🎬</div>
                                <div>
                                    <p className="text-sm font-medium text-white">{scheduleModal.videoTitle}</p>
                                    <p className="text-[10px] text-gray-500">Will be scheduled for upload</p>
                                </div>
                            </div>

                            {/* Circular Time picker */}
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-2">Upload Time</label>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setNoteModal(null)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">📝 Note</h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    {(() => {
                                        const [y, m, d] = noteModal.key.split("-").map(Number)
                                        return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                                    })()}
                                </p>
                            </div>
                            <button onClick={() => setNoteModal(null)} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="p-5">
                            <textarea
                                ref={noteRef}
                                rows={5}
                                value={noteModal.note}
                                onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
                                placeholder="Write your note here..."
                                className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
                            />
                        </div>
                        <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
                            {calendarData[noteModal.key]?.note ? (
                                <button onClick={deleteNote} className="text-xs text-red-400 hover:text-red-300 transition-colors">Delete note</button>
                            ) : <div />}
                            <div className="flex gap-2">
                                <button onClick={() => setNoteModal(null)} className="text-xs px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-all">Cancel</button>
                                <button onClick={saveNote} className="text-xs px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors shadow-lg shadow-purple-500/20">Save Note</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
