"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"

export default function TrendsPage() {
  const router = useRouter()
  const [niche, setNiche] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post("/api/trends", { niche })
      setData(data.trends)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const urgencyColor: any = {
    high: "text-red-400 bg-red-900/20 border-red-700",
    medium: "text-yellow-400 bg-yellow-900/20 border-yellow-700",
    low: "text-green-400 bg-green-900/20 border-green-700"
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">← Dashboard</button>
          <span className="text-gray-700">/</span>
          <h1 className="font-semibold">🔥 AI Trend Detection</h1>
          <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700">
            Powered by Amazon Bedrock
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Search */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold mb-4 text-gray-200">Discover What's Trending in Your Niche</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchTrends()}
              placeholder="Enter your niche (e.g. fitness, cooking, tech, gaming...)"
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={fetchTrends}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "Analyzing..." : "Analyze Trends 🔍"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Claude AI analyzes current patterns to surface trending opportunities</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Amazon Bedrock is analyzing trends...</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-purple-900/20 border border-purple-700 rounded-xl p-4">
              <p className="text-purple-200">{data.summary}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-400">Best Platform: <span className="text-white font-medium">{data.bestPlatform}</span></span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {(data.topHashtags || []).map((tag: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-800 text-purple-300 px-2 py-1 rounded-full">
                    #{tag.replace("#", "")}
                  </span>
                ))}
              </div>
            </div>

            {/* Trend Cards */}
            {(data.trends || []).map((trend: any, i: number) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{trend.topic}</h3>
                    <span className="text-sm text-gray-400">{trend.platform}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${trend.growth >= 70 ? "text-green-400" : trend.growth >= 40 ? "text-yellow-400" : "text-gray-400"}`}>
                        {trend.growth}%
                      </div>
                      <div className="text-xs text-gray-500">growth</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border capitalize ${urgencyColor[trend.urgency] || urgencyColor.medium}`}>
                      {trend.urgency}
                    </span>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-3">{trend.description}</p>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Content Ideas</p>
                  <div className="space-y-1">
                    {(trend.contentIdeas || []).map((idea: string, j: number) => (
                      <div key={j} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-purple-400">→</span>
                        <span>{idea}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}