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
  instagram: string
  twitter: string
  linkedin: string
  hashtags: string
  keyMoments: string
  transcript: string
  thumbnailUrl: string
  videoUrl: string | null
}

const PLATFORMS = ["youtube", "instagram", "twitter", "linkedin"]
const PLATFORM_ICONS: any = {
  youtube: "/logos/youtube.png",
  instagram: "/logos/instagram.png",
  twitter: "🐦",
  linkedin: "/logos/linkedin.png"
}
const PLATFORM_COLORS: any = {
  youtube: "bg-[#ff6b6b]",
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
      <div className="min-h-screen bg-page text-main flex items-center justify-center font-satoshi">
        <div className="text-center max-w-md w-full bg-card border-4 border-main p-8 rounded shadow-[8px_8px_0px_0px_var(--shadow-main)] space-y-6">
          <div className="w-20 h-20 mx-auto relative">
            <div className="w-20 h-20 rounded-full border-4 border-main border-t-[#4dabf7] animate-spin shadow-[2px_2px_0px_0px_var(--shadow-main)]" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
          </div>
          <div>
            <h2 className="text-3xl font-cabinet font-black uppercase text-main mb-2 tracking-wide">AI is Working...</h2>
            <p className="text-[#4dabf7] font-cabinet font-bold uppercase">{processingStage}</p>
          </div>
          <div className="bg-page border-4 border-main rounded p-4 text-left space-y-3 shadow-inner">
            <p className="text-xs text-main font-cabinet font-black uppercase tracking-wider border-b-2 border-main pb-2">AWS Services Active</p>
            {[
              { service: "Amazon S3", job: "Video stored ✅" },
              { service: "Amazon Transcribe", job: "Converting audio to text..." },
              { service: "Amazon Bedrock", job: "Nova Pro generating content..." },
              { service: "Amazon DynamoDB", job: "Saving results..." },
            ].map(item => (
              <div key={item.service} className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm font-satoshi font-bold">
                <span className="text-gray-500 uppercase">{item.service}</span>
                <span className="text-main">{item.job}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs font-satoshi font-bold uppercase">This takes 2-3 minutes for a typical video</p>
        </div>
      </div>
    )
  }

  if (!video) return (
    <div className="min-h-screen bg-page text-main flex items-center justify-center font-cabinet font-black text-2xl uppercase">
      Video not found
    </div>
  )

  const viralScore = video.viralScore || 0
  const viralColor = viralScore >= 70 ? "text-main" : viralScore >= 40 ? "text-main" : "text-main"
  const viralBg = viralScore >= 70 ? "bg-[#b5e550] border-main" : viralScore >= 40 ? "bg-[#ffe066] border-main" : "bg-[#ff6b6b] border-main text-white"

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
    <div className="min-h-screen bg-page text-main font-satoshi selection:bg-[#ff6b6b] selection:text-white pb-32">

      {/* Main Content */}
      <div className="max-w-[1640px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-main pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🎬</span>
            <h1 className="text-4xl font-black font-cabinet uppercase text-main truncate max-w-2xl tracking-wide">{video.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePublish}
              disabled={published}
              className={`text-sm font-cabinet font-black uppercase border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)] px-5 py-3 rounded transition-all ${published ? "bg-[#b5e550] text-main cursor-not-allowed" : "bg-card hover:bg-[#ff6b6b] hover:text-white hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0px_0px_var(--shadow-main)]"}`}
            >
              {published ? "✅ Approved!" : "Approve →"}
            </button>
          </div>
        </div>

        {/* Published Banner */}
        {published && (
          <div className="mb-6 bg-[#b5e550] border-4 border-main p-4 rounded text-center text-main font-cabinet font-black uppercase tracking-wide shadow-[4px_4px_0px_0px_var(--shadow-main)]">
            🎉 Content approved and ready to be scheduled for posting across all selected platforms!
          </div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6">

          {/* COLUMN 1: AI ANALYTICS (Viral Score & Suggestions) */}
          <div className="col-span-1 space-y-6 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto pr-2 custom-scrollbar">

            {/* Viral Score */}
            <div className={`border-4 rounded shadow-[8px_8px_0px_0px_var(--shadow-main)] p-6 ${viralBg}`}>
              <p className="text-sm text-main font-cabinet font-black uppercase tracking-wider mb-2 border-b-2 border-main pb-2">AI Viral Score</p>
              <div className={`text-6xl font-cabinet font-black ${viralColor} drop-shadow-[2px_2px_0px_var(--shadow-main)]`}>{viralScore}</div>
              <div className="text-main font-satoshi font-bold text-sm mb-4 uppercase">Out of 100</div>
              <div className="w-full bg-page border-2 border-main rounded h-4 mb-4 shadow-inner overflow-hidden">
                <div
                  className={`h-full border-r-2 border-main transition-all ${viralScore >= 70 ? "bg-[#b5e550]" : viralScore >= 40 ? "bg-[#ffe066]" : "bg-[#ff6b6b]"}`}
                  style={{ width: `${viralScore}%` }}
                />
              </div>
              {video.viralReasoning && (
                <p className={`text-sm font-satoshi font-bold leading-relaxed ${viralScore < 40 ? "text-white" : "text-main"}`}>{video.viralReasoning}</p>
              )}
            </div>

            {/* AI Suggestions */}
            {improvements.length > 0 && (
              <div className="bg-card border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] p-5">
                <p className="text-sm font-cabinet font-black uppercase tracking-wider mb-4 border-b-2 border-main pb-2">💡 AI Suggestions</p>
                <ul className="space-y-3">
                  {improvements.map((tip: string, i: number) => (
                    <li key={i} className="text-sm text-main font-satoshi font-medium flex gap-3">
                      <span className="text-[#4dabf7] mt-0.5 font-bold">▶</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Moments */}
            {keyMoments.length > 0 && (
              <div className="bg-card border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] p-5">
                <p className="text-sm font-cabinet font-black uppercase tracking-wider mb-4 border-b-2 border-main pb-2">⏱️ Key Moments</p>
                <ul className="space-y-3">
                  {keyMoments.map((moment: any, i: number) => (
                    <li key={i} className="text-sm flex gap-3 pb-3 border-b-2 border-gray-100 last:border-0 last:pb-0 items-start">
                      <span className="text-white bg-black border-2 border-main rounded px-1.5 py-0.5 text-[10px] font-cabinet font-black shrink-0 shadow-[1px_1px_0px_0px_var(--shadow-main)]">{moment.timestamp}</span>
                      <span className="text-main font-satoshi font-medium">{moment.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* COLUMN 2: STUDIO PLAYER (Video & Transcript) */}
          <div className="col-span-1 xl:col-span-2 space-y-6">

            {/* Real Video Player */}
            <div className="bg-black border-8 border-main rounded shadow-[12px_12px_0px_0px_var(--shadow-main)] overflow-hidden aspect-video relative group">
              {video.videoUrl ? (
                <video
                  src={video.videoUrl}
                  controls
                  poster={video.thumbnailUrl ? `/api/thumbnails?key=${video.thumbnailUrl}` : undefined}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center">
                  <span className="text-6xl mb-4 animate-pulse">🎥</span>
                  <p className="font-cabinet font-black uppercase text-xl">Video stream not available</p>
                  <p className="text-gray-400 text-sm mt-2">Checking S3 storage...</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Thumbnail Mini-Card */}
              <div className="bg-card border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] overflow-hidden">
                <div className="p-3 border-b-4 border-main flex items-center justify-between bg-page">
                  <p className="text-[10px] font-cabinet font-black uppercase tracking-wider text-main">AI Generated Thumbnail</p>
                  <span className="bg-[#b5e550] text-[8px] font-cabinet font-black uppercase px-1.5 py-0.5 border border-main rounded">Ready</span>
                </div>
                <div className="aspect-video bg-page relative overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img src={`/api/thumbnails?key=${video.thumbnailUrl}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🖼️</div>
                  )}
                </div>
                <div className="p-3">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await axios.post(`/api/process/${video.id}/thumbnail`);
                        window.location.reload();
                      } catch (err) { setLoading(false); }
                    }}
                    className="w-full bg-[#4dabf7] text-white border-2 border-main py-1.5 rounded font-cabinet font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_var(--shadow-main)] hover:shadow-[4px_4px_0px_0px_var(--shadow-main)] transition-all"
                  >
                    ✨ Regenerate AI Thumbnail
                  </button>
                </div>
              </div>

              {/* Hashtag List */}
              <div className="bg-card border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] p-4">
                <p className="text-[10px] font-cabinet font-black uppercase tracking-wider mb-3 border-b-2 border-main pb-1">🏷️ Recommended Hashtags</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...(hashtagData.general || []), ...(hashtagData.niche || [])].map((tag: string, i: number) => (
                    <span key={i} className="text-[10px] bg-white border border-main text-main font-bold px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_var(--shadow-main)] uppercase">
                      #{tag.replace("#", "")}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Transcript Panel */}
            <div className="bg-card border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)]">
              <div className="p-3 border-b-4 border-main flex items-center gap-2 bg-page">
                <span className="text-xl">📝</span>
                <p className="text-sm font-cabinet font-black uppercase tracking-wider text-main">Full Transcription</p>
              </div>
              <div className="p-4 max-h-[200px] overflow-y-auto text-sm font-satoshi leading-relaxed font-medium bg-white custom-scrollbar italic text-gray-600">
                "{video.transcript || "No transcript available for this video."}"
              </div>
            </div>
          </div>

          {/* COLUMN 3: METADATA EDITOR */}
          <div className="col-span-1 space-y-6">

            {/* Platform Selection */}
            <div className="bg-card border-4 border-main rounded shadow-[4px_4px_0px_0px_var(--shadow-main)] p-3">
              <p className="text-[10px] font-cabinet font-black uppercase tracking-wider mb-3 text-center border-b-2 border-main pb-1">Switch Platform</p>
              <div className="grid grid-cols-4 gap-2">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform}
                    onClick={() => setActiveTab(platform)}
                    title={platform}
                    className={`flex items-center justify-center p-2 rounded border-2 border-main transition-all shadow-[1px_1px_0px_0px_var(--shadow-main)]
                      ${activeTab === platform ? "bg-black" : "bg-white hover:bg-gray-50"}`}
                  >
                    <img
                      src={PLATFORM_ICONS[platform].startsWith("/") ? PLATFORM_ICONS[platform] : undefined}
                      className={`w-6 h-6 object-contain ${activeTab === platform ? "invert" : ""}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Content */}
            {PLATFORMS.map(platform => {
              const content = getPlatformContent(platform)
              if (platform !== activeTab) return null

              return (
                <div key={platform} className={`border-4 border-main shadow-[8px_8px_0px_0px_var(--shadow-main)] rounded p-5 space-y-5 lg:h-[calc(100vh-320px)] lg:overflow-y-auto custom-scrollbar ${PLATFORM_COLORS[platform] || "bg-card"}`}>
                  <div className="flex items-center gap-2 pb-3 border-b-2 border-main">
                    <h3 className="font-cabinet font-black uppercase text-lg text-main">
                      {platform === "twitter" ? "X / Twitter" : platform} Edit
                    </h3>
                  </div>

                  {platform === "youtube" && content && (
                    <>
                      <div>
                        <label className="text-[10px] font-cabinet font-black text-main uppercase mb-1 block">SEO Title</label>
                        <textarea
                          value={getEditableContent(platform, "title")}
                          onChange={e => setEditable(platform, "title", e.target.value)}
                          className="w-full bg-white border-2 border-main rounded p-3 text-main font-satoshi font-bold text-sm resize-none focus:outline-none shadow-inner"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-cabinet font-black text-main uppercase mb-1 block">Description</label>
                        <textarea
                          value={getEditableContent(platform, "description")}
                          onChange={e => setEditable(platform, "description", e.target.value)}
                          className="w-full bg-white border-2 border-main rounded p-3 text-main font-satoshi font-bold text-xs resize-none focus:outline-none shadow-inner"
                          rows={12}
                        />
                      </div>
                    </>
                  )}

                  {platform === "instagram" && content && (
                    <>
                      <div>
                        <label className="text-[10px] font-cabinet font-black text-main uppercase mb-1 block">Post Caption</label>
                        <textarea
                          value={getEditableContent(platform, "caption")}
                          onChange={e => setEditable(platform, "caption", e.target.value)}
                          className="w-full bg-white border-2 border-main rounded p-3 text-main font-satoshi font-bold text-sm resize-none focus:outline-none shadow-inner"
                          rows={10}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-cabinet font-black text-main uppercase mb-1 block">Reels Overlay/Caption</label>
                        <textarea
                          value={getEditableContent(platform, "reels_caption")}
                          onChange={e => setEditable(platform, "reels_caption", e.target.value)}
                          className="w-full bg-white border-2 border-main rounded p-3 text-main font-satoshi font-bold text-sm resize-none focus:outline-none shadow-inner"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {platform === "twitter" && content && (
                    <div>
                      <label className="text-[10px] font-cabinet font-black text-main uppercase mb-1 block">Tweet Body</label>
                      <textarea
                        value={getEditableContent(platform, "tweet")}
                        onChange={e => setEditable(platform, "tweet", e.target.value)}
                        className="w-full bg-white border-2 border-main rounded p-3 text-main font-satoshi font-bold text-sm resize-none focus:outline-none shadow-inner"
                        rows={6}
                      />
                      <div className="text-[10px] font-cabinet font-black text-main uppercase text-right mt-1">
                        {getEditableContent(platform, "tweet").length}/280
                      </div>
                    </div>
                  )}

                  {platform === "linkedin" && content && (
                    <div>
                      <label className="text-[10px] font-cabinet font-black text-main uppercase mb-1 block">Article Post</label>
                      <textarea
                        value={getEditableContent(platform, "post")}
                        onChange={e => setEditable(platform, "post", e.target.value)}
                        className="w-full bg-white border-2 border-main rounded p-3 text-main font-satoshi font-bold text-sm resize-none focus:outline-none shadow-inner"
                        rows={14}
                      />
                    </div>
                  )}

                  {!content && (
                    <div className="text-center py-12 bg-white border-4 border-main border-dashed rounded text-main font-cabinet font-black uppercase italic">
                      <p>AI Generation Error</p>
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
