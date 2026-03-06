import { NextRequest, NextResponse } from "next/server"
import { getConnectedAccounts, getValidAccessToken } from "@/lib/dynamo-accounts"
import { getVideo } from "@/lib/dynamo"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
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

        // Helper to safely parse stringified platform JSON from DynamoDB
        const parseMeta = (str: string | undefined | null) => {
            if (!str) return {}
            try { return JSON.parse(str) } catch { return {} }
        }

        const ytMeta = parseMeta(video.youtube)
        const igMeta = parseMeta(video.instagram)
        const liMeta = parseMeta(video.linkedin)
        const hashtagsObj = parseMeta(video.hashtags)
        const allHashtags = [...(hashtagsObj.general || []), ...(hashtagsObj.niche || [])].map((t: string) => t.startsWith('#') ? t : `#${t}`).join(" ")

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
                    const ytDescription = (ytMeta.description || `Uploaded via Postable Scheduler`) + (allHashtags ? `\n\n${allHashtags}` : "")
                    const metadata = {
                        snippet: {
                            title: ytMeta.title || video.title || "Untitled Video",
                            description: ytDescription,
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
                    // Step 0: Get valid token
                    let accessToken: string
                    try {
                        accessToken = await getValidAccessToken(account)
                    } catch (tokenErr: any) {
                        results[platform] = { success: false, message: `Authentication failed: ${tokenErr.message}. Please reconnect your Instagram account.` }
                        continue
                    }

                    // Step 1: Get the exact Instagram Account ID linked to this OAuth user
                    const meRes = await fetch(
                        `https://graph.instagram.com/v22.0/me?fields=user_id&access_token=${accessToken}`
                    )
                    const meData = await meRes.json()
                    const igUserId = meData.user_id

                    if (!igUserId) {
                        results[platform] = { success: false, message: "Could not identify Instagram User ID from token." }
                        continue
                    }

                    // Step 2: Generate a temporary public S3 URL for Instagram to download the video
                    const command = new GetObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME!,
                        Key: video.s3Key,
                    });
                    // URL valid for 1 hour
                    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

                    // Step 3: Create Media Container for a REEL
                    const igCaption = (igMeta.caption || igMeta.reels_caption || video.title || "") + (allHashtags ? `\n\n${allHashtags}` : "");
                    const containerRes = await fetch(
                        `https://graph.instagram.com/v22.0/${igUserId}/media`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                access_token: accessToken,
                                media_type: "REELS",
                                video_url: presignedUrl,
                                caption: igCaption
                            })
                        }
                    )

                    const containerData = await containerRes.json()

                    if (!containerRes.ok || !containerData.id) {
                        results[platform] = { success: false, message: `Instagram Container creation failed: ${JSON.stringify(containerData)}` }
                        continue
                    }

                    const creationId = containerData.id;

                    // Step 4: Poll Container Status until FINISHED
                    let isReady = false;
                    let attempts = 0;
                    while (!isReady && attempts < 10) {
                        await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds between polls
                        attempts++;

                        const statusRes = await fetch(
                            `https://graph.instagram.com/v22.0/${creationId}?fields=status_code&access_token=${accessToken}`
                        );
                        const statusData = await statusRes.json();

                        if (statusData.status_code === "FINISHED") {
                            isReady = true;
                        } else if (statusData.status_code === "ERROR") {
                            results[platform] = { success: false, message: "Instagram processing failed." }
                            break;
                        }
                    }

                    if (!isReady && attempts >= 10) {
                        results[platform] = { success: false, message: "Instagram video processing timed out." }
                        continue;
                    }

                    // Step 5: Publish the finished container
                    const publishRes = await fetch(
                        `https://graph.instagram.com/v22.0/${igUserId}/media_publish`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                creation_id: creationId,
                                access_token: accessToken
                            })
                        }
                    )

                    const publishData = await publishRes.json()

                    if (publishRes.ok && publishData.id) {
                        results[platform] = { success: true, message: `Published! Post ID: ${publishData.id}` }
                    } else {
                        results[platform] = { success: false, message: `Instagram Publish failed: ${JSON.stringify(publishData)}` }
                    }

                } else if (platform === "linkedin") {
                    // LinkedIn video upload requires registerUpload + PUT flow
                    let accessToken: string
                    try {
                        accessToken = await getValidAccessToken(account)
                    } catch (tokenErr: any) {
                        results[platform] = { success: false, message: `Authentication failed: ${tokenErr.message}. Please reconnect your LinkedIn account.` }
                        continue
                    }

                    // Step 1: Get User URN
                    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    })
                    const profileData = await profileRes.json()
                    const personUrn = `urn:li:person:${profileData.sub}`

                    if (!profileData.sub) {
                        results[platform] = { success: false, message: "Could not fetch LinkedIn profile ID." }
                        continue
                    }

                    // Step 2: Register Upload
                    const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                            "X-Restli-Protocol-Version": "2.0.0",
                        },
                        body: JSON.stringify({
                            registerUploadRequest: {
                                recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
                                owner: personUrn,
                                serviceRelationships: [{
                                    relationshipType: "OWNER",
                                    identifier: "urn:li:userGeneratedContent"
                                }]
                            }
                        })
                    })

                    const registerData = await registerRes.json()

                    if (!registerRes.ok || !registerData.value) {
                        results[platform] = { success: false, message: `Failed to register LinkedIn upload: ${JSON.stringify(registerData)}` }
                        continue
                    }

                    const uploadMechanism = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
                    const assetUrn = registerData.value.asset
                    const uploadUrl = uploadMechanism.uploadUrl

                    // Step 3: Download video from S3
                    const s3Res = await s3Client.send(new GetObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME!,
                        Key: video.s3Key,
                    }))

                    const videoBytes = await s3Res.Body?.transformToByteArray()
                    if (!videoBytes) {
                        results[platform] = { success: false, message: "Failed to download video from S3" }
                        continue
                    }

                    // Step 4: PUT video to LinkedIn
                    const videoBuffer = Buffer.from(videoBytes)
                    const uploadRes = await fetch(uploadUrl, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": s3Res.ContentType || "video/mp4",
                            "Content-Length": String(videoBuffer.length),
                        },
                        body: videoBuffer,
                    })

                    if (!uploadRes.ok) {
                        const errText = await uploadRes.text()
                        results[platform] = { success: false, message: `LinkedIn video stream upload failed: ${uploadRes.status} - ${errText}` }
                        continue
                    }

                    // Step 5: Wait for processing (LinkedIn requires a small delay before the UGC post can attach the asset)
                    // We'll pause for 3 seconds since small files process quickly.
                    await new Promise(r => setTimeout(r, 3000));

                    // Step 6: Create the UGC Post
                    const shareRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${accessToken}`,
                            "X-Restli-Protocol-Version": "2.0.0",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            author: personUrn,
                            lifecycleState: "PUBLISHED",
                            specificContent: {
                                "com.linkedin.ugc.ShareContent": {
                                    shareCommentary: {
                                        text: (liMeta.post || video.title || "Check out this video!") + (allHashtags ? `\n\n${allHashtags}` : "")
                                    },
                                    shareMediaCategory: "VIDEO",
                                    media: [
                                        {
                                            status: "READY",
                                            media: assetUrn,
                                            title: { text: video.title || "Video" }
                                        }
                                    ]
                                }
                            },
                            visibility: {
                                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                            }
                        })
                    })

                    const shareData = await shareRes.json()

                    if (shareRes.ok && shareData.id) {
                        results[platform] = { success: true, message: `Published! Post ID: ${shareData.id}` }
                    } else {
                        results[platform] = { success: false, message: `LinkedIn post creation failed: ${JSON.stringify(shareData)}` }
                    }

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
