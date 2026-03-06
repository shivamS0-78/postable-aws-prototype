export interface ScheduledItem {
    videoId: string
    videoTitle: string
    time: string
    platforms: string[]
    autoUpload: boolean
    publishStatus?: "pending" | "publishing" | "published" | "failed"
    publishMessage?: string
}

export interface DayData {
    scheduled: ScheduledItem[]
    note: string
}

export type CalendarData = Record<string, DayData>

export const STORAGE_KEY = "postable_scheduler_data"

export function loadData(): CalendarData {
    if (typeof window === "undefined") return {}
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") } catch { return {} }
}

export function saveData(data: CalendarData) {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
