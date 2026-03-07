"use client"
import React, { useState } from 'react'
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'
import {
    TrendingUp, Users, Eye, MousePointer2, Share2, Download,
    ArrowUpRight, ArrowDownRight, Zap, Globe, Shield, ZapOff
} from 'lucide-react'

// Mock data for the dashboard
const performanceData = [
    { name: 'Mon', views: 4000, engagement: 2400, amt: 2400 },
    { name: 'Tue', views: 3000, engagement: 1398, amt: 2210 },
    { name: 'Wed', views: 2000, engagement: 9800, amt: 2290 },
    { name: 'Thu', views: 2780, engagement: 3908, amt: 2000 },
    { name: 'Fri', views: 1890, engagement: 4800, amt: 2181 },
    { name: 'Sat', views: 2390, engagement: 3800, amt: 2500 },
    { name: 'Sun', views: 3490, engagement: 4300, amt: 2100 },
]

const platformData = [
    { name: 'YouTube', value: 45, color: '#FF0000' },
    { name: 'Instagram', value: 30, color: '#E4405F' },
    { name: 'LinkedIn', value: 25, color: '#0A66C2' },
]

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
    <div className="bg-card border-4 border-main p-6 rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] hover:shadow-[8px_8px_0px_0px_var(--shadow-main)] transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 border-2 border-main rounded ${color} shadow-[2px_2px_0px_0px_var(--shadow-main)]`}>
                <Icon className="w-6 h-6 text-main" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-black font-cabinet uppercase ${change >= 0 ? 'text-[#00C853]' : 'text-[#ff6b6b]'}`}>
                {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(change)}%
            </div>
        </div>
        <h3 className="text-gray-500 font-cabinet font-bold uppercase text-xs tracking-wider mb-1">{title}</h3>
        <div className="text-3xl font-black font-cabinet uppercase tracking-tighter">{value}</div>
    </div>
)

export default function AnalyticsPage() {
    const [activePlatform, setActivePlatform] = useState('All')
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = () => {
        setIsExporting(true)
        setTimeout(() => setIsExporting(false), 2000)
    }

    return (
        <div className="min-h-screen bg-page p-6 md:p-10 space-y-10 selection:bg-[#ff6b6b] selection:text-white pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-main pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#ff6b6b] font-cabinet font-black uppercase text-sm tracking-widest">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b6b] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff6b6b]"></span>
                        </span>
                        Real-time Performance
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black font-cabinet uppercase tracking-tighter leading-none">
                        Unified <span className="text-[#b5e550] [text-shadow:2px_2px_0px_var(--shadow-main)]">Analytics</span>
                    </h1>
                    <p className="text-gray-600 font-medium max-w-xl">
                        Cross-platform insights and performance tracking. Deep dive into your content metrics across all connected accounts.
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-black text-white dark:bg-white dark:text-black border-4 border-main px-8 py-4 rounded font-cabinet font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--shadow-main)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_0px_var(--shadow-main)] transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    <Download className="w-5 h-5" />
                    {isExporting ? 'Exporting...' : 'Export Report'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Views" value="1.2M" change={12.5} icon={Eye} color="bg-[#b5e550]" />
                <StatCard title="Avg. Engagement" value="8.4%" change={3.2} icon={TrendingUp} color="bg-[#ff6b6b]" />
                <StatCard title="New Followers" value="+12,430" change={-1.5} icon={Users} color="bg-[#0A66C2]/20" />
                <StatCard title="Click Rate" value="4.2%" change={5.8} icon={MousePointer2} color="bg-[#FF0000]/10" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Performance Chart */}
                <div className="lg:col-span-2 bg-card border-4 border-main rounded-xl p-8 shadow-[6px_6px_0px_0px_var(--shadow-main)] relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black font-cabinet uppercase tracking-tight">Growth Trajectory</h2>
                            <p className="text-sm text-gray-500 font-medium">Daily performance metrics across all platforms</p>
                        </div>
                        <div className="flex bg-page border-2 border-main rounded p-1 p-1">
                            {['All', 'YouTube', 'Instagram', 'LinkedIn'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setActivePlatform(p)}
                                    className={`px-4 py-1.5 rounded font-cabinet font-bold text-xs uppercase transition-all ${activePlatform === p ? 'bg-[#b5e550] border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)]' : 'hover:bg-gray-200'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceData}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#b5e550" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#b5e550" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontFamily: 'Cabinet Grotesk', fontWeight: 600, fontSize: 12, fill: '#6B7280' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontFamily: 'Cabinet Grotesk', fontWeight: 600, fontSize: 12, fill: '#6B7280' }}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '4px solid #000',
                                        borderRadius: '0',
                                        fontFamily: 'Cabinet Grotesk',
                                        fontWeight: 'bold',
                                        boxShadow: '4px 4px 0px 0px #000'
                                    }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
                                <Area type="monotone" dataKey="engagement" stroke="#ff6b6b" strokeWidth={4} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Platform Breakdown */}
                <div className="bg-card border-4 border-main rounded-xl p-8 shadow-[6px_6px_0px_0px_var(--shadow-main)] flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-black font-cabinet uppercase tracking-tight mb-2">Platform Split</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">Traffic distribution by source</p>

                        <div className="space-y-6">
                            {platformData.map((platform) => (
                                <div key={platform.name} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="font-cabinet font-black uppercase text-sm">{platform.name}</span>
                                        <span className="font-cabinet font-black text-lg">{platform.value}%</span>
                                    </div>
                                    <div className="h-6 bg-page border-2 border-main rounded overflow-hidden p-0.5">
                                        <div
                                            className="h-full rounded transition-all duration-1000"
                                            style={{
                                                width: `${platform.value}%`,
                                                backgroundColor: platform.color,
                                                border: '1px solid #000'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-[#b5e550]/20 border-2 border-dashed border-main rounded flex items-center gap-4">
                        <Zap className="w-8 h-8 text-[#b5e550] shrink-0" />
                        <p className="text-xs font-bold uppercase leading-tight">
                            YouTube views are up <span className="text-[#00C853]">15%</span> compared to last week. Keep focusing on shorts!
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Section: AI Insights & Data Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Postable AI Trends */}
                <div className="bg-card text-main border-4 border-main rounded-xl p-8 shadow-[6px_6px_0px_0px_rgba(181,229,80,1)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                        <ZapOff className="w-48 h-48 rotate-12" />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#b5e550] border-2 border-main p-2 rounded shadow-[2px_2px_0px_0px_#000]">
                                <Shield className="w-6 h-6 text-black" />
                            </div>
                            <h2 className="text-3xl font-black font-cabinet uppercase italic tracking-tighter">AI Predictions</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: 'Viral Potential', insight: 'High possibility for "Tech Trends" clip to hit 500k+ views.', score: '92%' },
                                { title: 'Best Post Time', insight: 'Tuesday 6:00 PM EST is your peak engagement window.', score: '88%' },
                                { title: 'Content Gap', insight: 'Viewers are asking for more "behind-the-scenes" content.', score: '74%' },
                                { title: 'Topic Velocity', insight: '"AI Productivity" is trending 4x faster this week.', score: '96%' },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-page border-2 border-main p-4 rounded hover:bg-[#b5e550]/10 transition-all cursor-default text-main">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#b5e550]">{item.title}</span>
                                        <span className="text-lg font-black font-cabinet">{item.score}</span>
                                    </div>
                                    <p className="text-xs font-medium leading-relaxed opacity-90">{item.insight}</p>
                                </div>
                            ))}
                        </div>

                        <button className="w-full bg-[#b5e550] text-black border-2 border-main py-3 rounded font-cabinet font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all">
                            Generate Deep Insights Report
                        </button>
                    </div>
                </div>

                {/* Top Content Engagement */}
                <div className="bg-card border-4 border-main rounded-xl p-8 shadow-[6px_6px_0px_0px_var(--shadow-main)]">
                    <h2 className="text-2xl font-black font-cabinet uppercase tracking-tight mb-6">Top Performing Clips</h2>
                    <div className="space-y-4">
                        {[
                            { title: 'Future of AI Workspace', platform: 'YouTube', views: '124k', engagement: '12%' },
                            { title: 'Neon Coding Flow', platform: 'Instagram', views: '98k', engagement: '15%' },
                            { title: 'Productivity Hacks 2024', platform: 'LinkedIn', views: '45k', engagement: '8%' },
                            { title: 'Late Night Debugging', platform: 'YouTube', views: '32k', engagement: '5%' },
                        ].map((clip, idx) => (
                            <div key={idx} className="group border-2 border-main p-4 rounded shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-page border-2 border-main rounded flex items-center justify-center font-black italic">{idx + 1}</div>
                                    <div>
                                        <h4 className="font-cabinet font-black text-sm uppercase">{clip.title}</h4>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{clip.platform} • {clip.engagement} Engagement</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-cabinet font-black text-lg">{clip.views}</div>
                                    <div className="text-[10px] font-bold text-[#00C853] uppercase flex items-center gap-1 justify-end">
                                        <ArrowUpRight className="w-3 h-3" />
                                        Trending
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-6 border-2 border-main border-dashed py-3 rounded font-cabinet font-bold uppercase text-xs hover:bg-gray-100 transition-all">
                        View All Performance Data
                    </button>
                </div>
            </div>
        </div>
    )
}
