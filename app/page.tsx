"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"

interface Video {
  id: string
  title: string
  status: string
  createdAt: string
  viralScore: number | null
  youtube: any
}

const statusConfig: any = {
  uploaded: { label: "Uploaded", color: "bg-blue-500/20 text-blue-300", dot: "bg-blue-400" },
  processing: { label: "Processing AI...", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400 animate-pulse" },
  ready: { label: "Ready", color: "bg-green-500/20 text-green-300", dot: "bg-green-400" },
  published: { label: "Published", color: "bg-purple-500/20 text-purple-300", dot: "bg-purple-400" },
}

export default function Dashboard() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
    const interval = setInterval(fetchVideos, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchVideos = async () => {
    try {
      const { data } = await axios.get("/api/videos")
      setVideos(data.videos)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: videos.length,
    ready: videos.filter(v => v.status === "ready" || v.status === "published").length,
    avgScore: videos.filter(v => v.viralScore).length > 0
      ? Math.round(videos.filter(v => v.viralScore).reduce((a, v) => a + (v.viralScore || 0), 0) / videos.filter(v => v.viralScore).length)
      : 0
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">C</div>
            <h1 className="text-xl font-bold">ClipFlow</h1>
            <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700">
              Powered by AWS Bedrock
            </span>
          </div>
          <button
  onClick={() => router.push("/trends")}
  className="text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg text-sm transition-colors"
>
  🔥 Trends
</button>
          <button
            onClick={() => router.push("/upload")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Upload Video
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Videos", value: stats.total, icon: "🎬" },
            { label: "AI Processed", value: stats.ready, icon: "✅" },
            { label: "Avg Viral Score", value: stats.avgScore ? `${stats.avgScore}/100` : "—", icon: "🔥" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Videos List */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Your Videos</h2>

          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-700 rounded-xl">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-gray-400 mb-4">No videos yet. Upload your first one!</p>
              <button
                onClick={() => router.push("/upload")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
              >
                Upload Video
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => {
                const status = statusConfig[video.status] || statusConfig.uploaded
                return (
                  <div
                    key={video.id}
                    onClick={() => router.push(`/video/${video.id}`)}
                    className="bg-gray-800/50 border border-gray-700 hover:border-purple-500 rounded-xl p-5 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                        🎬
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{video.title}</h3>
                        <p className="text-gray-500 text-sm">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {video.viralScore && (
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            video.viralScore >= 70 ? "text-green-400" :
                            video.viralScore >= 40 ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {video.viralScore}
                          </div>
                          <div className="text-xs text-gray-500">Viral Score</div>
                        </div>
                      )}
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </div>
                      <span className="text-gray-600">→</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* AWS Badge */}
        <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/30">
          <p className="text-xs text-gray-500 text-center">
            🏗️ Built on AWS: <span className="text-gray-400">S3 (Storage) • DynamoDB (Database) • Bedrock/Claude (AI) • Transcribe (Speech-to-Text) • Lambda (Processing) • Amplify (Hosting)</span>
          </p>
        </div>
      </div>
    </div>
  )
}