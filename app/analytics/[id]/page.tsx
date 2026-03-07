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
    <div className="min-h-screen bg-[#f4f4f0] text-black flex items-center justify-center font-satoshi">
      <div className="text-center w-full max-w-sm bg-white border-4 border-black p-8 rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-12 h-12 border-4 border-black border-t-[#4dabf7] rounded-full animate-spin mx-auto mb-4" />
        <p className="font-cabinet font-black uppercase text-black tracking-wider">Loading analytics...</p>
      </div>
    </div>
  )

  if (!data?.analytics) return (
    <div className="min-h-screen bg-[#f4f4f0] text-black flex items-center justify-center font-satoshi">
      <div className="text-center w-full max-w-sm bg-white border-4 border-black p-8 rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-cabinet font-black uppercase text-black mb-6">No analytics yet. Publish your content first.</p>
        <button onClick={() => router.back()} className="font-cabinet font-black uppercase bg-[#ff6b6b] text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all px-6 py-3 rounded">← Go back</button>
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
    <div className="min-h-screen bg-[#f4f4f0] text-black font-satoshi pb-32">
      {/* Header */}
      <div className="border-b-4 border-black px-6 py-4 sticky top-0 bg-white z-10 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="font-cabinet font-black uppercase text-sm border-2 border-black rounded px-3 py-1.5 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white text-black">← Dashboard</button>
            <span className="text-black font-cabinet font-black">/</span>
            <h1 className="font-cabinet font-black text-2xl uppercase text-black truncate max-w-sm tracking-wide">
              Analytics: <span className="text-[#4dabf7]">{video.title}</span>
            </h1>
          </div>
          <button
            onClick={() => router.push(`/video/${params.id}`)}
            className="text-sm font-cabinet font-black uppercase text-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] px-4 py-2 rounded transition-all"
          >
            ← Edit Content
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {/* Total Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Total Views", value: totalViews.toLocaleString(), icon: "👁️", color: "bg-[#b5e550]" },
            { label: "Total Likes", value: totalLikes.toLocaleString(), icon: "❤️", color: "bg-[#ff6b6b]" },
            { label: "Total Shares", value: totalShares.toLocaleString(), icon: "🔄", color: "bg-[#4dabf7]" },
            { label: "Viral Score", value: `${video.viralScore}/100`, icon: "🔥", color: "bg-[#ffe066]" },
          ].map(stat => (
            <div key={stat.label} className={`border-4 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${stat.color}`}>
              <div className="text-3xl mb-4 bg-white border-2 border-black w-12 h-12 flex items-center justify-center rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{stat.icon}</div>
              <div className="text-4xl font-cabinet font-black text-black tracking-tight">{stat.value}</div>
              <div className="text-black font-satoshi font-bold uppercase text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {platforms.map(platform => (
            <div key={platform} className={`bg-white border-4 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-center hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all`}>
              <div className="text-3xl mb-3">{PLATFORM_ICONS[platform]}</div>
              <div className="text-2xl font-cabinet font-black text-black">
                {(analytics[platform]?.views || 0).toLocaleString()}
              </div>
              <div className="text-xs font-satoshi font-bold text-gray-500 uppercase tracking-widest mb-3">views</div>
              <div className="text-sm font-cabinet font-bold text-black bg-[#f4f4f0] border-2 border-black rounded py-1 max-w-[100px] mx-auto shadow-inner">
                {(analytics[platform]?.likes || 0).toLocaleString()} likes
              </div>
              <div className="text-xs font-satoshi font-bold text-gray-500 mt-2">
                {analytics[platform]?.watchTime}% watched
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bar Chart */}
          <div className="bg-white border-4 border-black rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h3 className="font-cabinet font-black text-black uppercase tracking-wider mb-6 pb-2 border-b-2 border-black text-lg">Views by Platform</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                <XAxis dataKey="platform" stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <YAxis stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "2px solid #000", boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
                  itemStyle={{ fontFamily: "Satoshi", fontWeight: "bold", color: "#000" }}
                  labelStyle={{ fontFamily: "Cabinet Grotesk", fontWeight: "900", color: "#000" }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                <Bar dataKey="views" fill="#ff6b6b" stroke="#000" strokeWidth={2} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className="bg-white border-4 border-black rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h3 className="font-cabinet font-black text-black uppercase tracking-wider mb-6 pb-2 border-b-2 border-black text-lg">7-Day Performance Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                <XAxis dataKey="day" stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <YAxis stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "2px solid #000", boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
                  itemStyle={{ fontFamily: "Satoshi", fontWeight: "bold" }}
                  labelStyle={{ fontFamily: "Cabinet Grotesk", fontWeight: "900", color: "#000" }}
                />
                <Legend wrapperStyle={{ fontFamily: "Cabinet Grotesk", fontWeight: "900", paddingTop: "10px" }} />
                <Line type="monotone" dataKey="views" stroke="#4dabf7" strokeWidth={4} dot={{ stroke: "#000", strokeWidth: 2, fill: "#fff", r: 4 }} activeDot={{ r: 6, stroke: "#000", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="engagement" stroke="#b5e550" strokeWidth={4} dot={{ stroke: "#000", strokeWidth: 2, fill: "#fff", r: 4 }} activeDot={{ r: 6, stroke: "#000", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}