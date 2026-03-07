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
    high: "bg-[#ff6b6b] text-white border-black",
    medium: "bg-[#ffe066] text-black border-black",
    low: "bg-[#b5e550] text-black border-black"
  }

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-satoshi pb-32">
      {/* Header */}
      <div className="border-b-4 border-black px-6 py-4 sticky top-0 bg-white z-10 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="font-cabinet font-black uppercase text-sm border-2 border-black rounded px-3 py-1.5 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white text-black">← Dashboard</button>
            <span className="text-black font-cabinet font-black">/</span>
            <h1 className="font-cabinet font-black text-2xl uppercase text-black">🔥 AI Trend Detection</h1>
          </div>
          <span className="text-[10px] font-cabinet font-black text-black uppercase bg-[#b5e550] px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Powered by Amazon Bedrock
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Search */}
        <div className="bg-white border-4 border-black rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <h2 className="font-cabinet font-black uppercase tracking-wider text-xl mb-6 text-black border-b-2 border-black pb-2">Discover What's Trending in Your Niche</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchTrends()}
              placeholder="Enter your niche (e.g. fitness, cooking, tech, gaming...)"
              className="flex-1 bg-[#f4f4f0] border-2 border-black rounded p-4 text-black font-satoshi font-bold focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner placeholder:text-gray-500"
            />
            <button
              onClick={fetchTrends}
              disabled={loading}
              className={`font-cabinet font-black uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-8 py-4 rounded transition-all text-lg ${loading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[#4dabf7] text-white hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"}`}
            >
              {loading ? "Analyzing..." : "Analyze Trends 🔍"}
            </button>
          </div>
          <div className="mt-6">
            <p className="text-sm font-cabinet font-black text-black uppercase mb-3">Filter Platforms:</p>
            <div className="flex flex-wrap gap-3">
              {availablePlatforms.map(p => {
                const isSelected = selectedPlatforms.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`font-cabinet font-bold uppercase border-2 border-black px-4 py-2 rounded transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${isSelected ? "bg-[#b5e550] text-black" : "bg-white text-gray-400 opacity-60 hover:opacity-100"
                      }`}
                  >
                    {p} {isSelected && "✓"}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-xs font-satoshi font-bold text-gray-500 uppercase mt-4 border-t-2 border-gray-100 pt-4">Claude AI analyzes current patterns to surface trending opportunities</p>
        </div>

        {loading && (
          <div className="text-center py-12 bg-white border-4 border-black border-dashed rounded shadow-inner">
            <div className="w-12 h-12 border-4 border-black border-t-[#4dabf7] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-black font-cabinet font-black uppercase">Amazon Bedrock is analyzing trends...</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-[#ffe066] border-4 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
              <p className="text-black font-satoshi font-bold leading-relaxed">{data.summary}</p>
              <div className="flex gap-4 mt-4 mb-2 text-sm font-cabinet font-black uppercase">
                <span className="text-black bg-white border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Best Platform: <span className="text-[#ff6b6b]">{data.bestPlatform}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t-2 border-black/10">
                {(data.topHashtags || []).map((tag: string, i: number) => (
                  <span key={i} className="text-xs bg-white text-black border-2 border-black font-cabinet font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-2 py-1 rounded cursor-default uppercase">
                    #{tag.replace("#", "")}
                  </span>
                ))}
              </div>
            </div>

            {/* Trend Cards */}
            <div className="grid grid-cols-1 gap-6">
              {(data.trends || []).map((trend: any, i: number) => (
                <div key={i} className="bg-white border-4 border-black rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 border-b-4 border-black pb-4 gap-4">
                    <div>
                      <h3 className="font-cabinet font-black uppercase text-xl text-black mb-1">{trend.topic}</h3>
                      <span className="text-xs font-satoshi font-bold text-gray-500 uppercase tracking-widest bg-[#f4f4f0] border-2 border-black px-2 py-0.5 rounded shadow-inner">{trend.platform}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right bg-black text-white border-2 border-black rounded px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className={`text-2xl font-cabinet font-black drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] ${trend.growth >= 70 ? "text-[#b5e550]" : trend.growth >= 40 ? "text-[#ffe066]" : "text-white"}`}>
                          +{trend.growth}%
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-wider">growth</div>
                      </div>
                      <span className={`text-xs font-cabinet font-black uppercase px-3 py-1.5 rounded border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${urgencyColor[trend.urgency] || urgencyColor.medium}`}>
                        {trend.urgency} Urgency
                      </span>
                    </div>
                  </div>

                  <p className="text-black font-satoshi font-medium text-sm mb-6 pb-4 border-b-2 border-gray-100">{trend.description}</p>

                  <div>
                    <p className="text-xs font-cabinet font-black text-black uppercase mb-3">💡 Content Ideas</p>
                    <div className="space-y-3">
                      {(trend.contentIdeas || []).map((idea: string, j: number) => (
                        <div key={j} className="text-sm text-black font-satoshi font-medium flex gap-3">
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