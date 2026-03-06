"use client"
import { useEffect, useRef, useCallback, useState } from "react"
import axios from "axios"
import { loadData, saveData, toKey } from "@/lib/scheduler-utils"

export default function SchedulerDaemon() {
    const publishingRef = useRef<Set<string>>(new Set())
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

    // Show toast helper
    const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 5000)
    }, [])

    useEffect(() => {
        const checkScheduledPublishes = async () => {
            const now = new Date()
            const todayKey = toKey(now)
            const currentData = loadData()
            const dayData = currentData[todayKey]
            if (!dayData?.scheduled) return

            for (const item of dayData.scheduled) {
                if (!item.autoUpload) continue
                if (item.publishStatus === "published" || item.publishStatus === "publishing") continue
                if (!item.platforms || item.platforms.length === 0) continue

                // Check if it's time
                const [schedH, schedM] = item.time.split(":").map(Number)
                const nowH = now.getHours()
                const nowM = now.getMinutes()

                if (schedH < nowH || (schedH === nowH && schedM <= nowM)) {
                    // Prevent duplicate publishes
                    const publishKey = `${todayKey}_${item.videoId}`
                    if (publishingRef.current.has(publishKey)) continue
                    publishingRef.current.add(publishKey)

                    // Mark as publishing
                    const newPublishingData = loadData()
                    const pDay = newPublishingData[todayKey]
                    if (pDay) {
                        saveData({
                            ...newPublishingData,
                            [todayKey]: {
                                ...pDay,
                                scheduled: pDay.scheduled.map(s =>
                                    s.videoId === item.videoId
                                        ? { ...s, publishStatus: "publishing" as const, publishMessage: "Uploading..." }
                                        : s
                                ),
                            },
                        })
                        window.dispatchEvent(new Event("scheduler-updated"))
                    }

                    showToast(`🚀 Auto-publishing "${item.videoTitle}"...`, "info")

                    try {
                        const res = await axios.post("/api/scheduled-publish", {
                            videoId: item.videoId,
                            platforms: item.platforms,
                        })

                        const results = res.data.results || {}
                        const allSuccess = Object.values(results).every((r: any) => r.success)
                        const messages = Object.entries(results).map(([p, r]: [string, any]) =>
                            `${p}: ${r.message}`
                        ).join("; ")

                        const endData = loadData()
                        const eDay = endData[todayKey]
                        if (eDay) {
                            saveData({
                                ...endData,
                                [todayKey]: {
                                    ...eDay,
                                    scheduled: eDay.scheduled.map(s =>
                                        s.videoId === item.videoId
                                            ? { ...s, publishStatus: allSuccess ? "published" as const : "failed" as const, publishMessage: messages }
                                            : s
                                    ),
                                },
                            })
                            window.dispatchEvent(new Event("scheduler-updated"))
                        }

                        if (allSuccess) {
                            showToast(`✅ "${item.videoTitle}" published successfully!`, "success")
                        } else {
                            showToast(`⚠️ "${item.videoTitle}" publish completed with issues`, "error")
                        }
                    } catch (err: any) {
                        const failData = loadData()
                        const fDay = failData[todayKey]
                        if (fDay) {
                            saveData({
                                ...failData,
                                [todayKey]: {
                                    ...fDay,
                                    scheduled: fDay.scheduled.map(s =>
                                        s.videoId === item.videoId
                                            ? { ...s, publishStatus: "failed" as const, publishMessage: err.message || "Publish failed" }
                                            : s
                                    ),
                                },
                            })
                            window.dispatchEvent(new Event("scheduler-updated"))
                        }
                        showToast(`❌ Failed to publish "${item.videoTitle}"`, "error")
                    }
                }
            }
        }

        checkScheduledPublishes()
        const interval = setInterval(checkScheduledPublishes, 30000)
        return () => clearInterval(interval)
    }, [showToast])

    if (!toast) return null

    return (
        <div className={`fixed bottom-4 right-4 z-[9999] max-w-sm px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl transition-all animate-in slide-in-from-right ${toast.type === "success" ? "bg-green-900/90 border-green-600 text-green-200"
            : toast.type === "error" ? "bg-red-900/90 border-red-600 text-red-200"
                : "bg-purple-900/90 border-purple-600 text-purple-200"
            }`}>
            {toast.message}
        </div>
    )
}
