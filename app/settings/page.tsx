"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"

interface PlatformConfig {
    id: string
    platform: string
    icon: string
    color: string
    hoverColor: string
    borderColor: string
    bgColor: string
    description: string
}

interface ConnectedInfo {
    platform: string
    username: string
    connectedAt: string
}

const platformConfigs: PlatformConfig[] = [
    {
        id: "youtube",
        platform: "YouTube",
        icon: "▶",
        color: "text-red-400",
        hoverColor: "hover:border-red-500",
        borderColor: "border-red-500",
        bgColor: "bg-red-500/10",
        description: "Upload and publish videos directly to your YouTube channel",
    },
    {
        id: "instagram",
        platform: "Instagram",
        icon: "📷",
        color: "text-pink-400",
        hoverColor: "hover:border-pink-500",
        borderColor: "border-pink-500",
        bgColor: "bg-pink-500/10",
        description: "Share Reels and short clips to your Instagram account",
    },
    {
        id: "linkedin",
        platform: "LinkedIn",
        icon: "💼",
        color: "text-blue-400",
        hoverColor: "hover:border-blue-500",
        borderColor: "border-blue-500",
        bgColor: "bg-blue-500/10",
        description: "Post professional video content to your LinkedIn profile",
    },
]

function SettingsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

    // Fetch connected accounts on mount
    useEffect(() => {
        fetchAccounts()
    }, [])

    // Handle OAuth callback query params
    useEffect(() => {
        const connected = searchParams.get("connected")
        const error = searchParams.get("error")

        if (connected) {
            const name = platformConfigs.find(p => p.id === connected)?.platform || connected
            showToast(`✅ ${name} connected successfully!`, "success")
            fetchAccounts()
            // Clean URL
            router.replace("/settings", { scroll: false })
        } else if (error) {
            const platform = error.split("_")[0]
            const name = platformConfigs.find(p => p.id === platform)?.platform || platform
            showToast(`❌ Failed to connect ${name}. Please try again.`, "error")
            router.replace("/settings", { scroll: false })
        }
    }, [searchParams])

    const fetchAccounts = async () => {
        try {
            const { data } = await axios.get("/api/connected-accounts")
            setConnectedAccounts(data.accounts || [])
        } catch {
            // Silently fail — show all as disconnected
        } finally {
            setLoading(false)
        }
    }

    const handleConnect = (platformId: string) => {
        // Redirect to our OAuth initiation endpoint — this opens the provider's consent screen
        window.location.href = `/api/auth/${platformId}`
    }

    const handleDisconnect = async (platformId: string) => {
        const name = platformConfigs.find(p => p.id === platformId)?.platform || platformId
        if (!confirm(`Disconnect your ${name} account?`)) return

        setDisconnectingId(platformId)
        try {
            await axios.delete(`/api/connected-accounts?platform=${platformId}`)
            setConnectedAccounts(prev => prev.filter(a => a.platform !== platformId))
            showToast(`${name} disconnected.`, "success")
        } catch {
            showToast(`Failed to disconnect ${name}.`, "error")
        } finally {
            setDisconnectingId(null)
        }
    }

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 4000)
    }

    const isConnected = (platformId: string) =>
        connectedAccounts.some(a => a.platform === platformId)

    const getAccountInfo = (platformId: string) =>
        connectedAccounts.find(a => a.platform === platformId)

    const connectedCount = connectedAccounts.length

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all animate-in slide-in-from-right ${toast.type === "success"
                    ? "bg-green-900/80 border-green-600 text-green-200"
                    : "bg-red-900/80 border-red-600 text-red-200"
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => router.push("/")}
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚙️</span>
                        <h1 className="text-xl font-bold text-purple-400">Settings</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
                {/* Connected Accounts Section */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold text-gray-200">Connected Accounts</h2>
                        <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full border border-gray-700">
                            {connectedCount}/{platformConfigs.length} connected
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">
                        Link your social media accounts to enable one-click publishing from ClipFlow.
                    </p>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading accounts...</div>
                    ) : (
                        <div className="space-y-4">
                            {platformConfigs.map((config) => {
                                const connected = isConnected(config.id)
                                const accountInfo = getAccountInfo(config.id)
                                return (
                                    <div
                                        key={config.id}
                                        className={`bg-gray-800/50 border rounded-xl p-5 transition-all ${connected
                                            ? `${config.borderColor} ${config.bgColor}`
                                            : `border-gray-700 ${config.hoverColor}`
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {/* Platform Icon */}
                                                <div
                                                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${connected ? config.bgColor : "bg-gray-700/50"
                                                        }`}
                                                >
                                                    {config.icon}
                                                </div>

                                                {/* Platform Info */}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`font-semibold ${connected ? config.color : "text-white"}`}>
                                                            {config.platform}
                                                        </h3>
                                                        {connected && (
                                                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-700 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                                Connected
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-500 text-sm mt-0.5">
                                                        {connected
                                                            ? `Signed in as ${accountInfo?.username}`
                                                            : config.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Connect/Disconnect Button */}
                                            <div>
                                                {connected ? (
                                                    <button
                                                        onClick={() => handleDisconnect(config.id)}
                                                        disabled={disconnectingId === config.id}
                                                        className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                                    >
                                                        {disconnectingId === config.id ? "Disconnecting..." : "Disconnect"}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleConnect(config.id)}
                                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all flex items-center gap-2"
                                                    >
                                                        Connect
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="border border-gray-700 rounded-xl p-5 bg-gray-800/30">
                    <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">🔒</span>
                        <div>
                            <h4 className="font-medium text-gray-200 text-sm">Secure OAuth Authentication</h4>
                            <p className="text-gray-500 text-sm mt-1">
                                ClipFlow uses industry-standard OAuth 2.0 to securely connect your accounts.
                                We never store your passwords — only revocable access tokens with minimal permissions required for publishing.
                            </p>
                        </div>
                    </div>
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

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center"><p className="text-gray-500">Loading settings...</p></div>}>
            <SettingsContent />
        </Suspense>
    )
}
