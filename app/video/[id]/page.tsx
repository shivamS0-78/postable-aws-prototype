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
  youtube: "bg-[#ff6b6b]",
  tiktok: "bg-white",
  instagram: "bg-[#ffe066]",
  twitter: "bg-[#4dabf7]",
  linkedin: "bg-[#b5e550]"
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
      <div className="min-h-screen bg-[#f4f4f0] text-black flex items-center justify-center font-satoshi">
        <div className="text-center max-w-md w-full bg-white border-4 border-black p-8 rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="w-20 h-20 mx-auto relative">
            <div className="w-20 h-20 rounded-full border-4 border-black border-t-[#4dabf7] animate-spin shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
          </div>
          <div>
            <h2 className="text-3xl font-cabinet font-black uppercase text-black mb-2 tracking-wide">AI is Working...</h2>
            <p className="text-[#4dabf7] font-cabinet font-bold uppercase">{processingStage}</p>
          </div>
          <div className="bg-[#f4f4f0] border-4 border-black rounded p-4 text-left space-y-3 shadow-inner">
            <p className="text-xs text-black font-cabinet font-black uppercase tracking-wider border-b-2 border-black pb-2">AWS Services Active</p>
            {[
              { service: "Amazon S3", job: "Video stored ✅" },
              { service: "Amazon Transcribe", job: "Converting audio to text..." },
              { service: "Amazon Bedrock", job: "Nova Pro generating content..." },
              { service: "Amazon DynamoDB", job: "Saving results..." },
            ].map(item => (
              <div key={item.service} className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm font-satoshi font-bold">
                <span className="text-gray-500 uppercase">{item.service}</span>
                <span className="text-black">{item.job}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs font-satoshi font-bold uppercase">This takes 2-3 minutes for a typical video</p>
        </div>
      </div>
    )
  }

  if (!video) return (
    <div className="min-h-screen bg-[#f4f4f0] text-black flex items-center justify-center font-cabinet font-black text-2xl uppercase">
      Video not found
    </div>
  )

  const viralScore = video.viralScore || 0
  const viralColor = viralScore >= 70 ? "text-black" : viralScore >= 40 ? "text-black" : "text-black"
  const viralBg = viralScore >= 70 ? "bg-[#b5e550] border-black" : viralScore >= 40 ? "bg-[#ffe066] border-black" : "bg-[#ff6b6b] border-black text-white"

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
    <div className="min-h-screen bg-[#f4f4f0] text-black font-satoshi selection:bg-[#ff6b6b] selection:text-white pb-32">

      {/* Header */}
      <div className="border-b-4 border-black px-6 py-4 sticky top-0 bg-white z-10 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="font-cabinet font-black uppercase text-sm border-2 border-black rounded px-3 py-1.5 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white text-black">
              ← Dashboard
            </button>
            <span className="text-black font-cabinet font-black">/</span>
            <h1 className="font-cabinet font-black text-2xl uppercase text-black truncate max-w-sm tracking-wide">{video.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/analytics/${id}`)}
              className="text-sm font-cabinet font-black uppercase text-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] px-4 py-2 rounded transition-all"
            >
              📊 Analytics
            </button>
            <button
              onClick={handlePublish}
              disabled={published}
              className={`text-sm font-cabinet font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-5 py-2 rounded transition-all ${published ? "bg-[#b5e550] text-black cursor-not-allowed" : "bg-white hover:bg-[#ff6b6b] hover:text-white hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"}`}
            >
              {published ? "✅ Scheduled!" : "Approve & Schedule →"}
            </button>
          </div>
        </div>
      </div>

      {/* Published Banner */}
      {published && (
        <div className="bg-[#b5e550] border-b-4 border-black px-6 py-3 text-center text-black font-cabinet font-black uppercase tracking-wide shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          🎉 Content approved and scheduled for posting across all selected platforms!
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="col-span-1 space-y-6">

            {/* Viral Score */}
            <div className={`border-4 rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 ${viralBg}`}>
              <p className="text-sm text-black font-cabinet font-black uppercase tracking-wider mb-2 border-b-2 border-black pb-2">AI Viral Score</p>
              <div className={`text-6xl font-cabinet font-black ${viralColor} drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]`}>{viralScore}</div>
              <div className="text-black font-satoshi font-bold text-sm mb-4">OUT OF 100</div>
              <div className="w-full bg-[#f4f4f0] border-2 border-black rounded h-4 mb-4 shadow-inner overflow-hidden">
                <div
                  className={`h-full border-r-2 border-black transition-all ${viralScore >= 70 ? "bg-[#b5e550]" : viralScore >= 40 ? "bg-[#ffe066]" : "bg-[#ff6b6b]"}`}
                  style={{ width: `${viralScore}%` }}
                />
              </div>
              {video.viralReasoning && (
                <p className={`text-sm font-satoshi font-bold leading-relaxed ${viralScore < 40 ? "text-white" : "text-black"}`}>{video.viralReasoning}</p>
              )}
            </div>

            {/* Improvements */}
            {improvements.length > 0 && (
              <div className="bg-white border-4 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
                <p className="text-sm font-cabinet font-black uppercase tracking-wider mb-4 border-b-2 border-black pb-2">💡 AI Suggestions</p>
                <ul className="space-y-3">
                  {improvements.map((tip: string, i: number) => (
                    <li key={i} className="text-sm text-black font-satoshi font-medium flex gap-3">
                      <span className="text-[#4dabf7] mt-0.5 font-bold">▶</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hashtags */}
            {hashtagData.general && (
              <div className="bg-white border-4 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
                <p className="text-sm font-cabinet font-black uppercase tracking-wider mb-4 border-b-2 border-black pb-2">🏷️ Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {[...(hashtagData.general || []), ...(hashtagData.niche || [])].map((tag: string, i: number) => (
                    <span key={i} className="text-xs bg-white border-2 border-black text-black font-cabinet font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all px-2 py-1 rounded cursor-default uppercase">
                      #{tag.replace("#", "")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Moments */}
            {keyMoments.length > 0 && (
              <div className="bg-white border-4 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
                <p className="text-sm font-cabinet font-black uppercase tracking-wider mb-4 border-b-2 border-black pb-2">⏱️ Key Moments</p>
                <ul className="space-y-3">
                  {keyMoments.map((moment: any, i: number) => (
                    <li key={i} className="text-sm flex gap-3 pb-3 border-b-2 border-gray-100 last:border-0 last:pb-0 items-start">
                      <span className="text-white bg-black border-2 border-black rounded px-1.5 py-0.5 text-[10px] font-cabinet font-black shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{moment.timestamp}</span>
                      <span className="text-black font-satoshi font-medium">{moment.description}</span>
                      {moment.clipWorthy && <span className="text-xl shrink-0 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" title="Clip Worthy">📎</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column — Platform Tabs */}
          <div className="col-span-1 md:col-span-2 space-y-6">

            {/* Platform Tabs */}
            <div className="flex gap-3 flex-wrap">
              {PLATFORMS.map(platform => (
                <button
                  key={platform}
                  onClick={() => setActiveTab(platform)}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-cabinet font-black uppercase border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                    ${activeTab === platform
                      ? "bg-black text-white"
                      : "bg-white text-black"
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
                <div key={platform} className={`border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded p-6 space-y-6 ${PLATFORM_COLORS[platform] || "bg-white"}`}>
                  <div className="flex items-center gap-3 pb-4 border-b-4 border-black">
                    <span className="text-3xl bg-white border-2 border-black rounded flex items-center justify-center w-12 h-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{PLATFORM_ICONS[platform]}</span>
                    <h3 className="font-cabinet font-black uppercase text-xl text-black">
                      {platform === "twitter" ? "X (Twitter)" : platform}
                    </h3>
                    <span className="text-[10px] font-cabinet font-bold text-black uppercase ml-auto bg-white border-2 border-black px-2 py-1 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">✏️ Click to edit</span>
                  </div>

                  {platform === "youtube" && content && (
                    <>
                      <div>
                        <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Title</label>
                        <textarea
                          value={getEditableContent(platform, "title")}
                          onChange={e => setEditable(platform, "title", e.target.value)}
                          className="w-full bg-[#f4f4f0] border-2 border-black rounded p-3 text-black font-satoshi font-bold text-sm resize-none focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Description</label>
                        <textarea
                          value={getEditableContent(platform, "description")}
                          onChange={e => setEditable(platform, "description", e.target.value)}
                          className="w-full bg-[#f4f4f0] border-2 border-black rounded p-3 text-black font-satoshi font-bold text-sm resize-none focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner"
                          rows={6}
                        />
                      </div>
                    </>
                  )}

                  {platform === "tiktok" && content && (
                    <>
                      <div>
                        <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Caption</label>
                        <textarea
                          value={getEditableContent(platform, "caption")}
                          onChange={e => setEditable(platform, "caption", e.target.value)}
                          className="w-full bg-[#f4f4f0] border-2 border-black rounded p-3 text-black font-satoshi font-bold text-sm resize-none focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner"
                          rows={3}
                        />
                      </div>
                      {content.hooks && (
                        <div>
                          <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Hook Options</label>
                          <div className="space-y-3">
                            {content.hooks.map((hook: string, i: number) => (
                              <div key={i} className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded p-3 text-sm font-satoshi font-bold text-black">
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
                        <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Caption</label>
                        <textarea
                          value={getEditableContent(platform, "caption")}
                          onChange={e => setEditable(platform, "caption", e.target.value)}
                          className="w-full bg-[#f4f4f0] border-2 border-black rounded p-3 text-black font-satoshi font-bold text-sm resize-none focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner"
                          rows={5}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Reels Caption</label>
                        <textarea
                          value={getEditableContent(platform, "reels_caption")}
                          onChange={e => setEditable(platform, "reels_caption", e.target.value)}
                          className="w-full bg-[#f4f4f0] border-2 border-black rounded p-3 text-black font-satoshi font-bold text-sm resize-none focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner"
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {platform === "twitter" && content && (
                    <div>
                      <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Tweet</label>
                      <textarea
                        value={getEditableContent(platform, "tweet")}
                        onChange={e => setEditable(platform, "tweet", e.target.value)}
                        className="w-full bg-[#f4f4f0] border-2 border-black rounded p-3 text-black font-satoshi font-bold text-sm resize-none focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner"
                        rows={3}
                      />
                      <div className="text-xs font-cabinet font-black text-black uppercase text-right mt-2">
                        {getEditableContent(platform, "tweet").length}/280
                      </div>
                    </div>
                  )}

                  {platform === "linkedin" && content && (
                    <div>
                      <label className="text-sm font-cabinet font-black text-black uppercase mb-2 block">Post</label>
                      <textarea
                        value={getEditableContent(platform, "post")}
                        onChange={e => setEditable(platform, "post", e.target.value)}
                        className="w-full bg-[#f4f4f0] border-2 border-black rounded p-3 text-black font-satoshi font-bold text-sm resize-none focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shadow-inner"
                        rows={7}
                      />
                    </div>
                  )}

                  {!content && (
                    <div className="text-center py-12 bg-[#f4f4f0] border-4 border-black border-dashed rounded text-black font-cabinet font-black uppercase shadow-inner">
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
