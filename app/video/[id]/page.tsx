"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"

interface Video {
  id: string
  title: string
  status: string
  s3Key: string
  viralScore: number | null
  viralReasoning: string
  viralImprovements: string
  youtube: string
  tiktok: string
  instagram: string
  twitter: string
  linkedin: string
  hashtags: string
  keyMoments: string
  transcript: string
}

const PLATFORMS = ["youtube", "tiktok", "instagram", "twitter", "linkedin"]
const PLATFORM_ICONS: any = {
  youtube: "🎬",
  tiktok: "🎵",
  instagram: "📸",
  twitter: "🐦",
  linkedin: "💼"
}
const PLATFORM_COLORS: any = {
  youtube: "border-red-500 bg-red-950/20",
  tiktok: "border-pink-500 bg-pink-950/20",
  instagram: "border-orange-500 bg-orange-950/20",
  twitter: "border-sky-500 bg-sky-950/20",
  linkedin: "border-blue-500 bg-blue-950/20"
}

function parseJSON(str: string | null) {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}

export default function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("youtube")
  const [processingStarted, setProcessingStarted] = useState(false)
  const [editedContent, setEditedContent] = useState<any>({})
  const [published, setPublished] = useState(false)
  const [processingStage, setProcessingStage] = useState("Starting AI analysis...")

  const stages = [
    "Starting AI analysis...",
    "Transcribing audio with Amazon Transcribe...",
    "Extracting key moments...",
    "Generating platform-specific content with Nova Pro...",
    "Calculating viral score...",
    "Finalizing results..."
  ]

  useEffect(() => {
    fetchVideo()
  }, [])

  useEffect(() => {
    if (video?.status === "uploaded" && !processingStarted) {
      setProcessingStarted(true)
      startProcessing()
    }
    if (video?.status === "processing") {
      const interval = setInterval(fetchVideo, 4000)
      let stageIndex = 0
      const stageInterval = setInterval(() => {
        stageIndex = (stageIndex + 1) % stages.length
        setProcessingStage(stages[stageIndex])
      }, 4000)
      return () => {
        clearInterval(interval)
        clearInterval(stageInterval)
      }
    }
    if (video?.status === "ready") {
      setLoading(false)
    }
  }, [video?.status])

  const fetchVideo = async () => {
    try {
      const { data } = await axios.get(`/api/videos/${id}`)
      setVideo(data.video)
      if (data.video.status === "ready" || data.video.status === "error") {
        setLoading(false)
      }
    } catch (err) {
      setLoading(false)
    }
  }

  const startProcessing = async () => {
    try {
      await axios.post(`/api/process/${id}`)
      await fetchVideo()
    } catch (err) {
      console.error("Processing failed:", err)
      setLoading(false)
    }
  }

  const handlePublish = () => {
    setPublished(true)
  }

  if (loading || video?.status === "processing" || video?.status === "uploaded") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 mx-auto relative">
            <div className="w-20 h-20 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">AI is Working...</h2>
            <p className="text-purple-300 font-medium">{processingStage}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">AWS Services Active</p>
            {[
              { service: "Amazon S3", job: "Video stored ✅" },
              { service: "Amazon Transcribe", job: "Converting audio to text..." },
              { service: "Amazon Bedrock", job: "Nova Pro generating content..." },
              { service: "Amazon DynamoDB", job: "Saving results..." },
            ].map(item => (
              <div key={item.service} className="flex justify-between text-sm">
                <span className="text-gray-400">{item.service}</span>
                <span className="text-gray-300">{item.job}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm">This takes 2-3 minutes for a typical video</p>
        </div>
      </div>
    )
  }

  if (!video) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      Video not found
    </div>
  )

  const viralScore = video.viralScore || 0
  const viralColor = viralScore >= 70 ? "text-green-400" : viralScore >= 40 ? "text-yellow-400" : "text-red-400"
  const viralBg = viralScore >= 70 ? "bg-green-900/20 border-green-500" : viralScore >= 40 ? "bg-yellow-900/20 border-yellow-500" : "bg-red-900/20 border-red-500"

  const improvements = parseJSON(video.viralImprovements) || []
  const keyMoments = parseJSON(video.keyMoments) || []
  const hashtagData = parseJSON(video.hashtags) || {}

  const getPlatformContent = (platform: string) => {
    const raw = (video as any)[platform]
    return parseJSON(raw)
  }

  const getEditableContent = (platform: string, field: string) => {
    if (editedContent[platform]?.[field] !== undefined) {
      return editedContent[platform][field]
    }
    const content = getPlatformContent(platform)
    return content?.[field] || ""
  }

  const setEditable = (platform: string, field: string, value: string) => {
    setEditedContent((prev: any) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value }
    }))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 sticky top-0 bg-gray-950/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">
              ← Dashboard
            </button>
            <span className="text-gray-700">/</span>
            <h1 className="font-semibold text-white truncate max-w-xs">{video.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/analytics/${id}`)}
              className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors"
            >
              📊 Analytics
            </button>
            <button
              onClick={handlePublish}
              disabled={published}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
            >
              {published ? "✅ Scheduled!" : "Approve & Schedule →"}
            </button>
          </div>
        </div>
      </div>

      {/* Published Banner */}
      {published && (
        <div className="bg-green-900/30 border-b border-green-700 px-6 py-3 text-center text-green-300">
          🎉 Content approved and scheduled for posting across all selected platforms!
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="col-span-1 space-y-4">

            {/* Viral Score */}
            <div className={`border rounded-xl p-5 ${viralBg}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">AI Viral Score</p>
              <div className={`text-6xl font-black ${viralColor}`}>{viralScore}</div>
              <div className="text-gray-400 text-sm mb-3">out of 100</div>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all ${viralScore >= 70 ? "bg-green-400" : viralScore >= 40 ? "bg-yellow-400" : "bg-red-400"}`}
                  style={{ width: `${viralScore}%` }}
                />
              </div>
              {video.viralReasoning && (
                <p className="text-gray-300 text-sm">{video.viralReasoning}</p>
              )}
            </div>

            {/* Improvements */}
            {improvements.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">💡 AI Suggestions</p>
                <ul className="space-y-2">
                  {improvements.map((tip: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hashtags */}
            {hashtagData.general && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">🏷️ Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {[...(hashtagData.general || []), ...(hashtagData.niche || [])].map((tag: string, i: number) => (
                    <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                      #{tag.replace("#", "")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Moments */}
            {keyMoments.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">⏱️ Key Moments</p>
                <ul className="space-y-2">
                  {keyMoments.map((moment: any, i: number) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-purple-400 font-mono">{moment.timestamp}</span>
                      <span className="text-gray-300">{moment.description}</span>
                      {moment.clipWorthy && <span className="text-green-400 text-xs">📎</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column — Platform Tabs */}
          <div className="col-span-2 space-y-4">

            {/* Platform Tabs */}
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(platform => (
                <button
                  key={platform}
                  onClick={() => setActiveTab(platform)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${activeTab === platform
                      ? "bg-gray-700 text-white border border-gray-500"
                      : "bg-gray-800/50 text-gray-400 hover:text-white border border-transparent"
                    }`}
                >
                  {PLATFORM_ICONS[platform]}
                  <span className="capitalize">{platform === "twitter" ? "X" : platform}</span>
                </button>
              ))}
            </div>

            {/* Platform Content */}
            {PLATFORMS.map(platform => {
              const content = getPlatformContent(platform)
              if (platform !== activeTab) return null

              return (
                <div key={platform} className={`border rounded-xl p-5 space-y-4 ${PLATFORM_COLORS[platform]}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{PLATFORM_ICONS[platform]}</span>
                    <h3 className="font-semibold capitalize text-lg">
                      {platform === "twitter" ? "X (Twitter)" : platform}
                    </h3>
                    <span className="text-xs text-gray-500 ml-auto">✏️ Click any field to edit</span>
                  </div>

                  {platform === "youtube" && content && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Title</label>
                        <textarea
                          value={getEditableContent(platform, "title")}
                          onChange={e => setEditable(platform, "title", e.target.value)}
                          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Description</label>
                        <textarea
                          value={getEditableContent(platform, "description")}
                          onChange={e => setEditable(platform, "description", e.target.value)}
                          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                          rows={6}
                        />
                      </div>
                    </>
                  )}

                  {platform === "tiktok" && content && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Caption</label>
                        <textarea
                          value={getEditableContent(platform, "caption")}
                          onChange={e => setEditable(platform, "caption", e.target.value)}
                          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                          rows={3}
                        />
                      </div>
                      {content.hooks && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase mb-2 block">Hook Options</label>
                          <div className="space-y-2">
                            {content.hooks.map((hook: string, i: number) => (
                              <div key={i} className="bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm text-gray-300">
                                {hook}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {platform === "instagram" && content && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Caption</label>
                        <textarea
                          value={getEditableContent(platform, "caption")}
                          onChange={e => setEditable(platform, "caption", e.target.value)}
                          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                          rows={5}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Reels Caption</label>
                        <textarea
                          value={getEditableContent(platform, "reels_caption")}
                          onChange={e => setEditable(platform, "reels_caption", e.target.value)}
                          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {platform === "twitter" && content && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase mb-1 block">Tweet</label>
                      <textarea
                        value={getEditableContent(platform, "tweet")}
                        onChange={e => setEditable(platform, "tweet", e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                        rows={3}
                      />
                      <div className="text-xs text-gray-500 text-right mt-1">
                        {getEditableContent(platform, "tweet").length}/280
                      </div>
                    </div>
                  )}

                  {platform === "linkedin" && content && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase mb-1 block">Post</label>
                      <textarea
                        value={getEditableContent(platform, "post")}
                        onChange={e => setEditable(platform, "post", e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                        rows={7}
                      />
                    </div>
                  )}

                  {!content && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Content not available. Try reprocessing.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
