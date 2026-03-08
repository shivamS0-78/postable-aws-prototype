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
    logoSize?: string
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
        icon: "/logos/youtube.png",
        color: "text-[#FF0000]",
        hoverColor: "hover:border-red-500",
        borderColor: "border-red-500",
        bgColor: "bg-red-500/10",
        description: "Upload and publish videos directly to your YouTube channel",
        logoSize: "w-14 h-14"
    },
    {
        id: "instagram",
        platform: "Instagram",
        icon: "/logos/instagram.png",
        color: "text-[#E4405F]",
        hoverColor: "hover:border-pink-500",
        borderColor: "border-pink-500",
        bgColor: "bg-pink-500/10",
        description: "Share Reels and short clips to your Instagram account",
        logoSize: "w-16 h-16"
    },
    {
        id: "linkedin",
        platform: "LinkedIn",
        icon: "/logos/linkedin.png",
        color: "text-[#0A66C2]",
        hoverColor: "hover:border-blue-500",
        borderColor: "border-blue-500",
        bgColor: "bg-blue-500/10",
        description: "Post professional video content to your LinkedIn profile",
        logoSize: "w-16 h-16"
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
        <div className="min-h-screen bg-page text-main font-satoshi selection:bg-[#ff6b6b] selection:text-white">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded border-4 border-main font-cabinet font-bold uppercase text-sm shadow-[4px_4px_0px_0px_var(--shadow-main)] transition-all animate-in slide-in-from-right ${toast.type === "success"
                    ? "bg-[#b5e550] text-main"
                    : "bg-[#ff6b6b] text-white"
                    }`}>
                    {toast.message}
                </div>
            )}

            <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
                <div className="flex items-center gap-3 border-b-4 border-main pb-4">
                    <span className="text-4xl">⚙️</span>
                    <h1 className="text-4xl font-black font-cabinet uppercase tracking-wide">Settings</h1>
                </div>
                {/* Connected Accounts Section */}
                <div>
                    <div className="flex items-center justify-between mb-4 border-b-4 border-main pb-2">
                        <h2 className="text-2xl font-black font-cabinet uppercase">Connected Accounts</h2>
                        <span className="text-sm bg-[#ff6b6b] text-white font-bold font-cabinet uppercase px-3 py-1 rounded border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)]">
                            {connectedCount}/{platformConfigs.length} connected
                        </span>
                    </div>
                    <p className="text-gray-600 font-medium text-sm mb-8">
                        Link your social media accounts to enable one-click publishing from POSTABLE.
                    </p>

                    {loading ? (
                        <div className="text-center py-12 font-cabinet font-bold uppercase text-xl animate-pulse">Loading accounts...</div>
                    ) : (
                        <div className="space-y-4">
                            {platformConfigs.map((config) => {
                                const connected = isConnected(config.id)
                                const accountInfo = getAccountInfo(config.id)
                                return (
                                    <div
                                        key={config.id}
                                        className={`bg-card border-4 border-main rounded p-5 shadow-[4px_4px_0px_0px_var(--shadow-main)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_var(--shadow-main)] transition-all flex items-center justify-between ${connected ? "" : ""}`}
                                    >
                                        <div className="flex items-center gap-6">
                                            {/* Platform Icon */}
                                            <div
                                                className={`w-20 h-20 border-2 border-main rounded shadow-[2px_2px_0px_0px_var(--shadow-main)] flex items-center justify-center text-3xl ${connected ? config.bgColor : "bg-card"
                                                    }`}
                                            >
                                                {config.icon.startsWith("/") ? (
                                                    <img src={config.icon} alt={config.platform} className={`${config.logoSize || "w-12 h-12"} object-contain`} />
                                                ) : (
                                                    config.icon
                                                )}
                                            </div>

                                            {/* Platform Info */}
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className={`font-cabinet font-black text-xl uppercase tracking-tighter ${connected ? config.color : "text-main"}`}>
                                                        {config.platform}
                                                    </h3>
                                                    {connected && (
                                                        <span className="text-xs bg-[#b5e550] text-main font-bold uppercase px-2 py-0.5 rounded border-2 border-main shadow-[1px_1px_0px_0px_var(--shadow-main)] flex items-center gap-1">
                                                            Connected
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 font-medium text-sm">
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
                                                    className="px-6 py-3 rounded border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)] bg-card hover:bg-[#ff6b6b] hover:text-white font-cabinet font-bold uppercase text-sm transition-all disabled:opacity-50"
                                                >
                                                    {disconnectingId === config.id ? "Working..." : "Disconnect"}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnect(config.id)}
                                                    className="px-6 py-3 rounded border-2 border-main shadow-[2px_2px_0px_0px_var(--shadow-main)] bg-[#4dabf7] text-white font-cabinet font-bold uppercase text-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[0px_0px_0px_0px_var(--shadow-main)] transition-all"
                                                >
                                                    Connect →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-[#b5e550] border-4 border-main rounded p-6 shadow-[6px_6px_0px_0px_var(--shadow-main)]">
                    <div className="flex items-start gap-4">
                        <span className="text-3xl">🔒</span>
                        <div>
                            <h4 className="font-cabinet font-black uppercase text-xl mb-2">Secure OAuth Authentication</h4>
                            <p className="font-satoshi font-medium text-main/80">
                                POSTABLE uses industry-standard OAuth 2.0 to securely connect your accounts.
                                We never store your passwords — only revocable access tokens with minimal permissions required for publishing.
                            </p>
                        </div>
                    </div>
                </div>

                {/* AWS Badge */}
                <div className="bg-card border-4 border-main rounded p-4 shadow-[4px_4px_0px_0px_var(--shadow-main)] text-center font-cabinet font-bold uppercase text-sm">
                    🏗️ Built on AWS: S3 (Storage) • DynamoDB (Database) • Bedrock/Claude (AI) • Transcribe (Speech-to-Text) • Lambda (Processing) • Amplify (Hosting)
                </div>

                {/* Logo Attribution */}
                <div className="text-center text-xs text-gray-500 font-satoshi">
                    <a href="https://www.flaticon.com/free-icons/youtube" title="youtube icons" target="_blank" rel="noopener noreferrer" className="hover:underline mx-1">Youtube icons by Freepik</a>
                    <span className="mx-1">|</span>
                    <a href="https://www.flaticon.com/free-icons/instagram-logo" title="instagram logo icons" target="_blank" rel="noopener noreferrer" className="hover:underline mx-1">Instagram logo icons by Freepik</a>
                    <span className="mx-1">|</span>
                    <a href="https://www.flaticon.com/free-icons/linkedin" title="linkedin icons" target="_blank" rel="noopener noreferrer" className="hover:underline mx-1">Linkedin icons by Freepik</a>
                </div>
            </div>
        </div>
    )
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-page text-main flex items-center justify-center"><p className="font-cabinet font-bold uppercase animate-pulse">Loading settings...</p></div>}>
            <SettingsContent />
        </Suspense>
    )
}
