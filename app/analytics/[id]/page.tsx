"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Legend
} from "recharts"

const PLATFORM_ICONS: any = {
  youtube: "🎬", instagram: "📸", twitter: "🐦", linkedin: "💼"
}
const PLATFORM_COLORS: any = {
  youtube: "#ef4444", instagram: "#f97316",
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
    <div className="min-h-screen bg-page text-main flex items-center justify-center font-satoshi">
      <div className="text-center w-full max-w-sm bg-card border-4 border-main p-8 rounded shadow-[8px_8px_0px_0px_var(--shadow-main)]">
        <div className="w-12 h-12 border-4 border-main border-t-[#4dabf7] rounded-full animate-spin mx-auto mb-4" />
        <p className="font-cabinet font-black uppercase text-main tracking-wider">Loading analytics...</p>
      </div>
    </div>
  )

  if (!data?.analytics) return (
    <div className="min-h-screen bg-page text-main flex items-center justify-center font-satoshi">
      <div className="text-center w-full max-w-sm bg-card border-4 border-main p-8 rounded shadow-[8px_8px_0px_0px_var(--shadow-main)]">
        <p className="font-cabinet font-black uppercase text-main mb-6">No analytics yet. Publish your content first.</p>
        <button onClick={() => router.back()} className="font-cabinet font-black uppercase bg-[#ff6b6b] text-white border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_var(--shadow-main)] transition-all px-6 py-3 rounded">← Go back</button>
      </div>
    </div>
  )

  const { analytics, video } = data
  const platforms = ["youtube", "instagram", "twitter", "linkedin"]

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
    <div className="min-h-screen bg-page text-main font-satoshi pb-32">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        <div className="flex items-center justify-between border-b-4 border-main pb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📊</span>
            <h1 className="text-4xl font-black font-cabinet uppercase text-main truncate max-w-2xl tracking-wide">
              Analytics: <span className="text-[#4dabf7]">{video.title}</span>
            </h1>
          </div>
          <button
            onClick={() => router.push(`/video/${params.id}`)}
            className="text-sm font-cabinet font-black uppercase text-main bg-card border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_var(--shadow-main)] px-5 py-3 rounded transition-all"
          >
            ← Edit Content
          </button>
        </div>
        {/* Total Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Total Views", value: totalViews.toLocaleString(), icon: "👁️", color: "bg-[#b5e550]" },
            { label: "Total Likes", value: totalLikes.toLocaleString(), icon: "❤️", color: "bg-[#ff6b6b]" },
            { label: "Total Shares", value: totalShares.toLocaleString(), icon: "🔄", color: "bg-[#4dabf7]" },
            { label: "Viral Score", value: `${video.viralScore}/100`, icon: "🔥", color: "bg-[#ffe066]" },
          ].map(stat => (
            <div key={stat.label} className={`border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] p-6 hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0px_0px_var(--shadow-main)] transition-all ${stat.color}`}>
              <div className="text-3xl mb-4 bg-card border-2 border-main w-12 h-12 flex items-center justify-center rounded shadow-[2px_2px_0px_0px_var(--shadow-main)]">{stat.icon}</div>
              <div className="text-4xl font-cabinet font-black text-main tracking-tight">{stat.value}</div>
              <div className="text-main font-satoshi font-bold uppercase text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {platforms.map(platform => (
            <div key={platform} className={`bg-card border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] p-4 text-center hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0px_0px_var(--shadow-main)] transition-all`}>
              <div className="text-3xl mb-3">{PLATFORM_ICONS[platform]}</div>
              <div className="text-2xl font-cabinet font-black text-main">
                {(analytics[platform]?.views || 0).toLocaleString()}
              </div>
              <div className="text-xs font-satoshi font-bold text-gray-500 uppercase tracking-widest mb-3">views</div>
              <div className="text-sm font-cabinet font-bold text-main bg-page border-2 border-main rounded py-1 max-w-[100px] mx-auto shadow-inner">
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
          <div className="bg-card border-4 border-main rounded shadow-[8px_8px_0px_0px_var(--shadow-main)] p-6">
            <h3 className="font-cabinet font-black text-main uppercase tracking-wider mb-6 pb-2 border-b-2 border-main text-lg">Views by Platform</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                <XAxis dataKey="platform" stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <YAxis stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "2px solid #000", boxShadow: "4px 4px 0px 0px var(--shadow-main)" }}
                  itemStyle={{ fontFamily: "Satoshi", fontWeight: "bold", color: "#000" }}
                  labelStyle={{ fontFamily: "Cabinet Grotesk", fontWeight: "900", color: "#000" }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                <Bar dataKey="views" fill="#ff6b6b" stroke="#000" strokeWidth={2} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className="bg-card border-4 border-main rounded shadow-[8px_8px_0px_0px_var(--shadow-main)] p-6">
            <h3 className="font-cabinet font-black text-main uppercase tracking-wider mb-6 pb-2 border-b-2 border-main text-lg">7-Day Performance Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                <XAxis dataKey="day" stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <YAxis stroke="#000" tick={{ fill: "#000", fontSize: 12, fontFamily: "Satoshi", fontWeight: "bold" }} axisLine={{ strokeWidth: 2 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "2px solid #000", boxShadow: "4px 4px 0px 0px var(--shadow-main)" }}
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