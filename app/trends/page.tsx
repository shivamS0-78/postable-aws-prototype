"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"

export default function TrendsPage() {
  const router = useRouter()
  const [niche, setNiche] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  const availablePlatforms = ["YouTube", "Instagram", "X", "LinkedIn"]
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(availablePlatforms)

  const LOGO_MAP: Record<string, string> = {
    YouTube: "/logos/youtube.png",
    Instagram: "/logos/instagram.png",
    LinkedIn: "/logos/linkedin.png",
  }

  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) { // prevent deselecting all
        setSelectedPlatforms(selectedPlatforms.filter(x => x !== p))
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p])
    }
  }

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post("/api/trends", { niche, platforms: selectedPlatforms })
      setData(data.trends)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const urgencyColor: any = {
    high: "bg-[#ff6b6b] text-white border-main",
    medium: "bg-[#ffe066] text-main border-main",
    low: "bg-[#b5e550] text-main border-main"
  }

  return (
    <div className="min-h-screen bg-page text-main font-satoshi pb-32">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between border-b-4 border-main pb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔥</span>
            <h1 className="text-4xl font-black font-cabinet uppercase tracking-wide">AI Trend Detection</h1>
          </div>
          <span className="text-xs font-cabinet font-black text-main uppercase bg-[#b5e550] px-3 py-1.5 rounded border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)]">
            Powered by Amazon Bedrock
          </span>
        </div>
        {/* Search */}
        <div className="bg-card border-4 border-main rounded shadow-[8px_8px_0px_0px_var(--shadow-main)] p-8">
          <h2 className="font-cabinet font-black uppercase tracking-wider text-xl mb-6 text-main border-b-2 border-main pb-2">Discover What's Trending in Your Niche</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchTrends()}
              placeholder="Enter your niche (e.g. fitness, cooking, tech, gaming...)"
              className="flex-1 bg-page border-2 border-main rounded p-4 text-main font-satoshi font-bold focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_var(--shadow-main)] transition-all shadow-inner placeholder:text-gray-500"
            />
            <button
              onClick={fetchTrends}
              disabled={loading}
              className={`font-cabinet font-black uppercase border-2 border-main shadow-[4px_4px_0px_0px_var(--shadow-main)] px-8 py-4 rounded transition-all text-lg ${loading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[#4dabf7] text-white hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0px_0px_var(--shadow-main)]"}`}
            >
              {loading ? "Analyzing..." : "Analyze Trends 🔍"}
            </button>
          </div>
          <div className="mt-6">
            <p className="text-sm font-cabinet font-black text-main uppercase mb-3">Filter Platforms:</p>
            <div className="flex flex-wrap gap-3">
              {availablePlatforms.map(p => {
                const isSelected = selectedPlatforms.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`font-cabinet font-bold uppercase border-2 border-main px-4 py-2 rounded transition-all shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_var(--shadow-main)] flex items-center gap-2 ${isSelected ? "bg-[#b5e550] text-main" : "bg-card text-gray-400 opacity-60 hover:opacity-100"
                      }`}
                  >
                    {LOGO_MAP[p] ? (
                      <img src={LOGO_MAP[p]} alt={p} className="w-6 h-6 object-contain" />
                    ) : null}
                    {p} {isSelected && "✓"}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-xs font-satoshi font-bold text-gray-500 uppercase mt-4 border-t-2 border-gray-100 pt-4">Claude AI analyzes current patterns to surface trending opportunities</p>
        </div>

        {loading && (
          <div className="text-center py-12 bg-card border-4 border-main border-dashed rounded shadow-inner">
            <div className="w-12 h-12 border-4 border-main border-t-[#4dabf7] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-main font-cabinet font-black uppercase">Amazon Bedrock is analyzing trends...</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-[#ffe066] border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] p-6">
              <p className="text-main font-satoshi font-bold leading-relaxed">{data.summary}</p>
              <div className="flex gap-4 mt-4 mb-2 text-sm font-cabinet font-black uppercase">
                <span className="text-main bg-card border-2 border-main px-3 py-1.5 rounded shadow-[2px_2px_0px_0px_var(--shadow-main)]">
                  Best Platform: <span className="text-[#ff6b6b]">{data.bestPlatform}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t-2 border-main/10">
                {(data.topHashtags || []).map((tag: string, i: number) => (
                  <span key={i} className="text-xs bg-card text-main border-2 border-main font-cabinet font-bold shadow-[2px_2px_0px_0px_var(--shadow-main)] px-2 py-1 rounded cursor-default uppercase">
                    #{tag.replace("#", "")}
                  </span>
                ))}
              </div>
            </div>

            {/* Trend Cards */}
            <div className="grid grid-cols-1 gap-6">
              {(data.trends || []).map((trend: any, i: number) => (
                <div key={i} className="bg-card border-4 border-main rounded shadow-[8px_8px_0px_0px_var(--shadow-main)] p-6 hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[10px_10px_0px_0px_var(--shadow-main)] transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 border-b-4 border-main pb-4 gap-4">
                    <div>
                      <h3 className="font-cabinet font-black uppercase text-xl text-main mb-1">{trend.topic}</h3>
                      <div className="flex items-center gap-2">
                        {LOGO_MAP[trend.platform] && (
                          <img src={LOGO_MAP[trend.platform]} alt={trend.platform} className="w-6 h-6 object-contain" />
                        )}
                        <span className="text-xs font-satoshi font-bold text-gray-500 uppercase tracking-widest bg-page border-2 border-main px-2 py-0.5 rounded shadow-inner">{trend.platform}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right bg-black text-white border-2 border-main rounded px-3 py-1 shadow-[2px_2px_0px_0px_var(--shadow-main)]">
                        <div className={`text-2xl font-cabinet font-black drop-shadow-[1px_1px_0px_var(--shadow-main)] ${trend.growth >= 70 ? "text-[#b5e550]" : trend.growth >= 40 ? "text-[#ffe066]" : "text-white"}`}>
                          +{trend.growth}%
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-wider">growth</div>
                      </div>
                      <span className={`text-xs font-cabinet font-black uppercase px-3 py-1.5 rounded border-2 shadow-[2px_2px_0px_0px_var(--shadow-main)] ${urgencyColor[trend.urgency] || urgencyColor.medium}`}>
                        {trend.urgency} Urgency
                      </span>
                    </div>
                  </div>

                  <p className="text-main font-satoshi font-medium text-sm mb-6 pb-4 border-b-2 border-gray-100">{trend.description}</p>

                  <div>
                    <p className="text-xs font-cabinet font-black text-main uppercase mb-3">💡 Content Ideas</p>
                    <div className="space-y-3">
                      {(trend.contentIdeas || []).map((idea: string, j: number) => (
                        <div key={j} className="text-sm text-main font-satoshi font-medium flex gap-3">
                          <span className="text-[#4dabf7] font-bold mt-0.5">▶</span>
                          <span>{idea}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}