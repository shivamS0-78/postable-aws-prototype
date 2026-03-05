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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button 
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-purple-400">Upload Video</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Video Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your video title..."
            disabled={uploading}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
            ${isDragActive ? "border-purple-400 bg-purple-900/20" : "border-gray-700 hover:border-gray-500"}
            ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            ${selectedFile ? "border-green-500 bg-green-900/10" : ""}
          `}
        >
          <input {...getInputProps()} />
          {selectedFile ? (
            <div className="space-y-2">
              <div className="text-4xl">🎬</div>
              <p className="text-green-400 font-medium">{selectedFile.name}</p>
              <p className="text-gray-400 text-sm">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
              {!uploading && (
                <p className="text-gray-500 text-sm">Click or drag to change file</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-5xl">📹</div>
              <p className="text-lg font-medium text-gray-300">
                {isDragActive ? "Drop it here!" : "Drag & drop your video"}
              </p>
              <p className="text-gray-500 text-sm">MP4, MOV, AVI, WebM supported</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{stage}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg px-4 py-3 text-red-300 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-lg"
        >
          {uploading ? "Uploading..." : "Upload & Analyze with AI ✨"}
        </button>

        {/* Info boxes */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {[
            { icon: "☁️", label: "Stored on AWS S3" },
            { icon: "🤖", label: "Analyzed by Claude AI" },
            { icon: "📊", label: "Auto-optimized per platform" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}