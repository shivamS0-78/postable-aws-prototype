"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import axios from "axios"

export default function UploadPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("")
  const [title, setTitle] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState("")

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""))
    }
  }, [title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".webm"] },
    maxFiles: 1,
    disabled: uploading
  })

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setError("Please select a video and enter a title")
      return
    }
    setError("")
    setUploading(true)

    try {
      // Step 1: Get presigned URL from our API
      setStage("Preparing upload...")
      setProgress(10)
      const { data } = await axios.post("/api/upload-url", {
        filename: selectedFile.name,
        contentType: selectedFile.type,
      })
      const { uploadUrl, videoId, s3Key } = data

      // Step 2: Upload directly to S3
      setStage("Uploading to AWS S3...")
      setProgress(30)
      await axios.put(uploadUrl, selectedFile, {
        headers: { "Content-Type": selectedFile.type },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / (e.total || 1)) * 60)
          setProgress(30 + pct)
        },
      })

      // Step 3: Save video record to DynamoDB
      setStage("Saving to database...")
      setProgress(95)
      await axios.post("/api/videos", {
        videoId,
        s3Key,
        title: title.trim(),
        filename: selectedFile.name,
      })

      setProgress(100)
      setStage("Upload complete! Redirecting...")

      // Redirect to video page
      setTimeout(() => router.push(`/video/${videoId}`), 1000)

    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.")
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-satoshi selection:bg-[#ff6b6b] selection:text-white">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-3 border-b-4 border-black pb-4">
          <span className="text-4xl">📹</span>
          <h1 className="text-4xl font-black font-cabinet uppercase tracking-wide">Upload Video</h1>
        </div>

        {/* Title Input */}
        <div>
          <label className="block font-cabinet font-black text-lg uppercase tracking-wider mb-2">
            Video Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ENTER YOUR VIDEO TITLE..."
            disabled={uploading}
            className="w-full bg-white border-4 border-black rounded p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-satoshi font-bold placeholder:text-gray-400 focus:outline-none focus:translate-y-1 focus:translate-x-1 focus:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
          />
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-4 border-dashed rounded p-12 text-center cursor-pointer transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
            ${isDragActive ? "border-black bg-[#4dabf7]" : "border-black bg-white hover:bg-[#b5e550]"}
            ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            ${selectedFile ? "border-black bg-[#b5e550]" : ""}
          `}
        >
          <input {...getInputProps()} />
          {selectedFile ? (
            <div className="space-y-3">
              <div className="text-6xl mb-4">🎬</div>
              <p className="font-cabinet font-black text-2xl uppercase">{selectedFile.name}</p>
              <p className="font-satoshi font-bold text-black/70">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
              {!uploading && (
                <p className="font-satoshi font-bold text-black/50 text-sm mt-4 uppercase">Click or drag to change file</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-7xl mb-4">📹</div>
              <p className="font-cabinet font-black text-3xl uppercase">
                {isDragActive ? "DROP IT HERE!" : "DRAG & DROP YOUR VIDEO"}
              </p>
              <p className="font-satoshi font-bold text-gray-600 uppercase">MP4, MOV, AVI, WebM supported</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="space-y-2 bg-white border-4 border-black rounded p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between font-cabinet font-black uppercase">
              <span>{stage}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 border-2 border-black rounded h-6 mt-4 shadow-inner overflow-hidden">
              <div
                className="bg-[#4dabf7] h-full border-r-2 border-black transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[#ff6b6b] border-4 border-black rounded p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white font-cabinet font-bold uppercase">
            ❌ {error}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full bg-[#4dabf7] border-4 border-black text-black font-cabinet font-black uppercase text-xl py-6 rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:bg-gray-300 disabled:text-gray-500 transition-all hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        >
          {uploading ? "UPLOADING..." : "UPLOAD & ANALYZE WITH AI ✨"}
        </button>

        {/* Info boxes */}
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            { icon: "☁️", label: "Stored on AWS S3" },
            { icon: "🤖", label: "Analyzed by Claude AI" },
            { icon: "📊", label: "Auto-optimized per platform" },
          ].map((item) => (
            <div key={item.label} className="bg-white border-2 border-black rounded p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-cabinet font-bold uppercase text-xs">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}