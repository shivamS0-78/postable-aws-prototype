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
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  const handleDelete = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this video? This will permanently remove it from storage.")) return
    setDeletingId(videoId)
    try {
      await axios.delete(`/api/videos/${videoId}`)
      setVideos(prev => prev.filter(v => v.id !== videoId))
    } catch (err) {
      console.error(err)
      alert("Failed to delete video. Please try again.")
    } finally {
      setDeletingId(null)
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
    <div className="min-h-screen bg-[#f4f4f0] text-black font-satoshi selection:bg-[#ff6b6b] selection:text-white">


      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Videos", value: stats.total, icon: "🎬" },
            { label: "AI Processed", value: stats.ready, icon: "✅" },
            { label: "Avg Viral Score", value: stats.avgScore ? `${stats.avgScore}/100` : "—", icon: "🔥" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border-4 border-black rounded p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-4xl font-black font-cabinet mb-1">{stat.value}</div>
              <div className="text-gray-600 font-bold tracking-wide uppercase text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Videos List */}
        <div>
          <h2 className="text-2xl font-black font-cabinet mb-6 uppercase border-b-4 border-black pb-2 inline-block">Your Videos</h2>

          {loading ? (
            <div className="text-center py-20 font-cabinet font-bold text-xl uppercase animate-pulse">Loading Database...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 bg-white border-4 border-black border-dashed rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-6xl mb-6">🎬</div>
              <p className="font-cabinet font-bold text-xl mb-6 uppercase">No videos yet. Upload your first one!</p>
              <button
                onClick={() => router.push("/upload")}
                className="bg-[#b5e550] border-2 border-black text-black font-cabinet font-black uppercase tracking-wide px-8 py-4 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Let's Go →
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
                    className="bg-white border-4 border-black rounded p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-[#ff6b6b] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg flex items-center justify-center text-3xl">
                        🎬
                      </div>
                      <div>
                        <h3 className="font-cabinet font-black text-xl mb-1 uppercase tracking-tight">{video.title}</h3>
                        <p className="font-satoshi font-bold text-gray-500 text-sm">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {video.viralScore && (
                        <div className="text-center border-r-2 border-black pr-6">
                          <div className={`text-2xl font-black font-cabinet ${video.viralScore >= 70 ? "text-green-600" :
                            video.viralScore >= 40 ? "text-yellow-600" : "text-red-600"
                            }`}>
                            {video.viralScore}
                          </div>
                          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Viral Score</div>
                        </div>
                      )}

                      {/* Note: I'm leaving the status colors slightly muted to contrast with the stark black/white */}
                      <div className={`flex items-center gap-2 px-4 py-2 border-2 border-black rounded font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white`}>
                        {status.label}
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, video.id)}
                        disabled={deletingId === video.id}
                        className="p-3 bg-white border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black hover:bg-[#ff6b6b] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-110"
                        title="Delete video"
                      >
                        {deletingId === video.id ? (
                          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                      <span className="font-cabinet font-black text-2xl -ml-2 group-hover:translate-x-2 transition-transform">→</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* AWS Badge */}
        <div className="bg-white border-4 border-black rounded p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center font-cabinet font-bold uppercase text-sm">
          🏗️ Built on AWS: S3 (Storage) • DynamoDB (Database) • Bedrock/Claude (AI) • Transcribe (Speech-to-Text) • Lambda (Processing) • Amplify (Hosting)
        </div>
      </div>
    </div>
  )
}