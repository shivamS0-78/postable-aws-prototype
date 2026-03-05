"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Legend
} from "recharts"

const PLATFORM_ICONS: any = {
  youtube: "🎬", tiktok: "🎵", instagram: "📸", twitter: "🐦", linkedin: "💼"
}
const PLATFORM_COLORS: any = {
  youtube: "#ef4444", tiktok: "#ec4899", instagram: "#f97316",
  twitter: "#38bdf8", linkedin: "#3b82f6"
}

export default function AnalyticsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/analytics/${params.id}`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    </div>
  )

  if (!data?.analytics) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400">No analytics yet. Publish your content first.</p>
        <button onClick={() => router.back()} className="mt-4 text-purple-400 hover:text-purple-300">← Go back</button>
      </div>
    </div>
  )

  const { analytics, video } = data
  const platforms = ["youtube", "tiktok", "instagram", "twitter", "linkedin"]

  const totalViews = platforms.reduce((sum, p) => sum + (analytics[p]?.views || 0), 0)
  const totalLikes = platforms.reduce((sum, p) => sum + (analytics[p]?.likes || 0), 0)
  const totalShares = platforms.reduce((sum, p) => sum + (analytics[p]?.shares || 0), 0)

  const barData = platforms.map(p => ({
    platform: p === "twitter" ? "X" : p.charAt(0).toUpperCase() + p.slice(1),
    views: analytics[p]?.views || 0,
    likes: analytics[p]?.likes || 0,
    shares: analytics[p]?.shares || 0,
  }))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">← Dashboard</button>
            <span className="text-gray-700">/</span>
            <h1 className="font-semibold">Analytics: {video.title}</h1>
          </div>
          <button
            onClick={() => router.push(`/video/${params.id}`)}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            ← Edit Content
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Total Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Views", value: totalViews.toLocaleString(), icon: "👁️" },
            { label: "Total Likes", value: totalLikes.toLocaleString(), icon: "❤️" },
            { label: "Total Shares", value: totalShares.toLocaleString(), icon: "🔄" },
            { label: "Viral Score", value: `${video.viralScore}/100`, icon: "🔥" },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-5 gap-3">
          {platforms.map(platform => (
            <div key={platform} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">{PLATFORM_ICONS[platform]}</div>
              <div className="text-lg font-bold">
                {(analytics[platform]?.views || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mb-2">views</div>
              <div className="text-sm text-gray-300">
                {(analytics[platform]?.likes || 0).toLocaleString()} likes
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {analytics[platform]?.watchTime}% watched
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold mb-4 text-gray-200">Views by Platform</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="platform" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="views" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold mb-4 text-gray-200">7-Day Performance Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="engagement" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}