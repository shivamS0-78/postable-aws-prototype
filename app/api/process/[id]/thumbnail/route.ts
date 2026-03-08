import { NextRequest, NextResponse } from "next/server"
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { bedrockClient, s3Client } from "@/lib/aws"
import { getVideo, updateVideo } from "@/lib/dynamo"
import { getUserSession } from "@/lib/auth"

async function generateThumbnail(prompt: string): Promise<Buffer> {
    const modelId = process.env.BEDROCK_IMAGE_MODEL || "amazon.nova-canvas-v1:0"
    console.log(`Generating thumbnail with model: ${modelId}`)

    const isNovaCanvas = modelId.startsWith("amazon.nova-canvas")

    let requestBody: any

    if (isNovaCanvas) {
        requestBody = {
            taskType: "TEXT_IMAGE",
            textToImageParams: {
                text: prompt.trim(),
            },
            imageGenerationConfig: {
                numberOfImages: 1,
                quality: "premium",
                height: 720,
                width: 1280,
                cfgScale: 8.0,
                seed: Math.floor(Math.random() * 100000)
            }
        }
    } else {
        requestBody = {
            taskType: "TEXT_IMAGE",
            textToImageParams: {
                text: prompt.trim(),
            },
            imageGenerationConfig: {
                numberOfImages: 1,
                quality: "premium",
                height: 720,
                width: 1280,
                cfgScale: 8.0,
                seed: Math.floor(Math.random() * 100000)
            }
        }
    }

    const response = await bedrockClient.send(new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody)
    }))

    const result = JSON.parse(Buffer.from(response.body).toString())
    if (!result.images || result.images.length === 0) {
        throw new Error("No images returned from Bedrock")
    }
    const base64Image = result.images[0]
    return Buffer.from(base64Image, 'base64')
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: videoId } = await params

    try {
        const session = await getUserSession()
        if (!session || !session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const userId = session.userId as string

        const video = await getVideo(userId, videoId)
        if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 })

        const hashtags = video.hashtags ? JSON.parse(video.hashtags) : { general: [] }
        const themes = hashtags.general || []
        const thumbPrompt = `A cinematic, high-quality YouTube thumbnail for a video titled "${video.title || "Untitled"}". 
        Themes: ${themes.slice(0, 3).join(", ") || "General"}. 
        Style: Vibrant, engaging, centered composition, no text.`

        const thumbBuffer = await generateThumbnail(thumbPrompt)
        const thumbKey = `thumbnails/${videoId}-${Date.now()}.png`

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: thumbKey,
            Body: thumbBuffer,
            ContentType: "image/png"
        }))

        await updateVideo(userId, videoId, { thumbnailUrl: thumbKey })

        return NextResponse.json({ success: true, thumbnailUrl: thumbKey })
    } catch (error: any) {
        console.error("Manual thumbnail generation error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
