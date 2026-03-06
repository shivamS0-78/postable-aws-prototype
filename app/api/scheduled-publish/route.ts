import { NextRequest, NextResponse } from "next/server"
import { getConnectedAccounts, getValidAccessToken } from "@/lib/dynamo-accounts"
import { getVideo } from "@/lib/dynamo"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/aws"

export async function POST(req: NextRequest) {
    try {
        const { videoId, platforms } = await req.json()

        if (!videoId || !platforms || platforms.length === 0) {
            return NextResponse.json({ error: "videoId and platforms are required" }, { status: 400 })
        }

        // Fetch video info from DynamoDB
        const video = await getVideo(videoId)
        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 })
        }

        // Fetch all connected accounts (with tokens)
        const accounts = await getConnectedAccounts()

        const results: Record<string, { success: boolean; message: string }> = {}

        for (const platform of platforms) {
            const account = accounts.find(a => a.platform === platform)
            if (!account) {
                results[platform] = { success: false, message: "Account not connected" }
                continue
            }

            try {
                if (platform === "youtube") {
                    // ─── YouTube Upload via Resumable Upload API ───
                    // Step 0: Get a valid (non-expired) access token
                    let accessToken: string
                    try {
                        accessToken = await getValidAccessToken(account)
                    } catch (tokenErr: any) {
                        results[platform] = { success: false, message: `Authentication failed: ${tokenErr.message}. Please reconnect your YouTube account in Settings.` }
                        continue
                    }

                    // Step 1: Initiate resumable upload
                    const metadata = {
                        snippet: {
                            title: video.title || "Untitled Video",
                            description: video.youtube?.description || `Uploaded via Postable Scheduler`,
                            categoryId: "22", // People & Blogs
                        },
                        status: {
                            privacyStatus: "public",
                        },
                    }

                    const initRes = await fetch(
                        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(metadata),
                        }
                    )

                    if (!initRes.ok) {
                        const errBody = await initRes.text()
                        const hint = initRes.status === 401 || initRes.status === 403
                            ? " Your token may have been revoked. Please reconnect your YouTube account in Settings."
                            : ""
                        results[platform] = { success: false, message: `YouTube API error: ${initRes.status} - ${errBody}${hint}` }
                        continue
                    }

                    const uploadUrl = initRes.headers.get("Location")
                    if (!uploadUrl) {
                        results[platform] = { success: false, message: "Failed to get resumable upload URL" }
                        continue
                    }

                    // Step 2: Download video from S3
                    const s3Res = await s3Client.send(new GetObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME!,
                        Key: video.s3Key,
                    }))

                    const videoBytes = await s3Res.Body?.transformToByteArray()
                    if (!videoBytes) {
                        results[platform] = { success: false, message: "Failed to download video from S3" }
                        continue
                    }

                    // Step 3: Upload video data to YouTube
                    const videoBuffer = Buffer.from(videoBytes)
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: {
                            "Content-Type": s3Res.ContentType || "video/mp4",
                            "Content-Length": String(videoBuffer.length),
                        },
                        body: videoBuffer,
                    })

                    if (uploadRes.ok) {
                        const ytData = await uploadRes.json()
                        results[platform] = { success: true, message: `Published! Video ID: ${ytData.id}` }
                    } else {
                        const errText = await uploadRes.text()
                        results[platform] = { success: false, message: `Upload failed: ${uploadRes.status} - ${errText}` }
                    }

                } else if (platform === "instagram") {
                    // Instagram Reels upload requires Facebook Graph API + container publishing
                    // This is a placeholder — full implementation requires video hosting URL
                    results[platform] = { success: false, message: "Instagram Reels publishing requires additional setup (Facebook Graph API container flow)" }

                } else if (platform === "linkedin") {
                    // LinkedIn video upload requires registerUpload + PUT flow
                    // Placeholder for now
                    results[platform] = { success: false, message: "LinkedIn video publishing requires additional setup (registerUpload flow)" }

                } else {
                    results[platform] = { success: false, message: "Unsupported platform" }
                }
            } catch (err: any) {
                results[platform] = { success: false, message: err.message || "Unknown error" }
            }
        }

        return NextResponse.json({ results })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
