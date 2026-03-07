"use client"
import React, { useState, useEffect } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
    TrendingUp, Users, Eye, MousePointer2, Download,
    ArrowUpRight, ArrowDownRight, Zap, Shield, ZapOff, Loader2
} from 'lucide-react'

const StatCard = ({ title, value, change, icon: Icon, color, isLoading }: any) => (
    <div className="bg-card border-4 border-main p-6 rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] hover:shadow-[8px_8px_0px_0px_var(--shadow-main)] transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 border-2 border-main rounded ${color} shadow-[2px_2px_0px_0px_var(--shadow-main)]`}>
                <Icon className="w-6 h-6 text-main" />
            </div>
            {!isLoading && change !== undefined && (
                <div className={`flex items-center gap-1 text-sm font-black font-cabinet uppercase ${change >= 0 ? 'text-[#00C853]' : 'text-[#ff6b6b]'}`}>
                    {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(change)}%
                </div>
            )}
        </div>
        <h3 className="text-gray-500 font-cabinet font-bold uppercase text-xs tracking-wider mb-1">{title}</h3>
        {isLoading ? (
            <div className="h-9 bg-gray-200 dark:bg-gray-800 animate-pulse rounded w-24"></div>
        ) : (
            <div className="text-3xl font-black font-cabinet uppercase tracking-tighter">{value}</div>
        )}
    </div>
)

export default function AnalyticsPage() {
    const [activePlatform, setActivePlatform] = useState('All')
    const [isExporting, setIsExporting] = useState(false)

    const [data, setData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch('/api/analytics')
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
            } catch (err) {
                console.error("Failed to fetch analytics:", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchAnalytics()
    }, [])

    const handleExport = () => {
        setIsExporting(true)
        setTimeout(() => setIsExporting(false), 2000)
    }

    // Use either fetched data or safe defaults while loading
    const stats = data?.stats || { totalViews: '...', avgEngagement: '...', newFollowers: '...', clickRate: '...' }
    const performanceData = data?.performanceData || []
    const platformData = data?.platformData || []
    const topClips = data?.topClips || []
    const aiInsights = data?.aiInsights || []
    const activePlatforms = data?.activePlatforms || ['YouTube', 'Instagram', 'LinkedIn']

    return (
        <div className="min-h-screen bg-page p-6 md:p-10 space-y-10 selection:bg-[#ff6b6b] selection:text-white pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-main pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#ff6b6b] font-cabinet font-black uppercase text-sm tracking-widest">
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b6b] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff6b6b]"></span>
                            </span>
                        )}
                        {isLoading ? 'Syncing Platforms...' : 'Real-time Performance'}
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black font-cabinet uppercase tracking-tighter leading-none">
                        Unified <span className="text-[#b5e550] [text-shadow:2px_2px_0px_var(--shadow-main)]">Analytics</span>
                    </h1>
                    <p className="text-gray-600 font-medium max-w-xl">
                        {isLoading
                            ? "Connecting to YouTube, Instagram, and LinkedIn APIs to fetch your latest performance metrics."
                            : "Cross-platform insights and performance tracking based on your connected accounts."}
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={isExporting || isLoading}
                    className="bg-black text-white dark:bg-white dark:text-black border-4 border-main px-8 py-4 rounded font-cabinet font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--shadow-main)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_0px_var(--shadow-main)] transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    <Download className="w-5 h-5" />
                    {isExporting ? 'Exporting...' : 'Export Report'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Views" value={stats.totalViews} change={isLoading ? undefined : 12.5} icon={Eye} color="bg-[#b5e550]" isLoading={isLoading} />
                <StatCard title="Avg. Engagement" value={stats.avgEngagement} change={isLoading ? undefined : 3.2} icon={TrendingUp} color="bg-[#ff6b6b]" isLoading={isLoading} />
                <StatCard title="New Followers" value={stats.newFollowers} change={isLoading ? undefined : -1.5} icon={Users} color="bg-[#0A66C2]/20" isLoading={isLoading} />
                <StatCard title="Click Rate" value={stats.clickRate} change={isLoading ? undefined : 5.8} icon={MousePointer2} color="bg-[#FF0000]/10" isLoading={isLoading} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Performance Chart */}
                <div className="lg:col-span-2 bg-card border-4 border-main rounded-xl p-8 shadow-[6px_6px_0px_0px_var(--shadow-main)] relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black font-cabinet uppercase tracking-tight">Growth Trajectory</h2>
                            <p className="text-sm text-gray-500 font-medium">Daily performance metrics across active platforms</p>
                        </div>
                        <div className="flex bg-page border-2 border-main rounded p-1 p-1">
                            {['All', ...activePlatforms].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setActivePlatform(p)}
                                    className={`px-4 py-1.5 rounded font-cabinet font-bold text-xs uppercase transition-all ${activePlatform === p ? 'bg-[#b5e550] border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)]' : 'hover:bg-gray-200 text-main'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        {isLoading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="w-12 h-12 text-gray-300 animate-spin" />
                            </div>
                        ) : (
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
                                            boxShadow: '4px 4px 0px 0px #000',
                                            color: '#000'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="views" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
                                    <Area type="monotone" dataKey="engagement" stroke="#ff6b6b" strokeWidth={4} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Platform Breakdown */}
                <div className="bg-card border-4 border-main rounded-xl p-8 shadow-[6px_6px_0px_0px_var(--shadow-main)] flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-black font-cabinet uppercase tracking-tight mb-2">Platform Split</h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">Traffic distribution by source</p>

                        <div className="space-y-6">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                                        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                                    </div>
                                ))
                            ) : platformData.map((platform: any) => (
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
                            {isLoading ? "Analyzing..." : `YouTube views are up 15% compared to last week. Keep focusing on shorts!`}
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
                            {isLoading ? (
                                [1, 2, 3, 4].map(i => (
                                    <div key={i} className="animate-pulse bg-page border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 rounded h-24"></div>
                                ))
                            ) : aiInsights.map((item: any, idx: number) => (
                                <div key={idx} className="bg-page border-2 border-main p-4 rounded hover:bg-[#b5e550]/10 transition-all cursor-default text-main">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#b5e550]">{item.title}</span>
                                        <span className="text-lg font-black font-cabinet">{item.score}</span>
                                    </div>
                                    <p className="text-xs font-medium leading-relaxed opacity-90">{item.insight}</p>
                                </div>
                            ))}
                        </div>

                        <button disabled={isLoading} className="w-full bg-[#b5e550] text-black border-2 border-main py-3 rounded font-cabinet font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all disabled:opacity-50">
                            {isLoading ? "Generating with Amazon Nova..." : "Generate Deep Insights Report"}
                        </button>
                    </div>
                </div>

                {/* Top Content Engagement */}
                <div className="bg-card border-4 border-main rounded-xl p-8 shadow-[6px_6px_0px_0px_var(--shadow-main)]">
                    <h2 className="text-2xl font-black font-cabinet uppercase tracking-tight mb-6">Top Performing Clips</h2>
                    <div className="space-y-4">
                        {isLoading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="animate-pulse h-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded w-full"></div>
                            ))
                        ) : topClips.map((clip: any, idx: number) => (
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
                    <button disabled={isLoading} className="w-full mt-6 border-2 border-main border-dashed py-3 rounded font-cabinet font-bold uppercase text-xs hover:bg-gray-100 transition-all disabled:opacity-50">
                        View All Performance Data
                    </button>
                </div>
            </div>
        </div>
    )
}
