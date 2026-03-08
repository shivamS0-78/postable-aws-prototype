import { NextRequest, NextResponse } from "next/server"
import { StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe"
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { transcribeClient, bedrockClient, s3Client } from "@/lib/aws"
import { getVideo, updateVideo } from "@/lib/dynamo"
import { getUserSession } from "@/lib/auth"

// Helper: wait for Transcribe job to complete
async function waitForTranscription(jobName: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))

    const result = await transcribeClient.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
    )

    const status = result.TranscriptionJob?.TranscriptionJobStatus

    if (status === "COMPLETED") {
      const transcriptUri = result.TranscriptionJob?.Transcript?.TranscriptFileUri
      if (!transcriptUri) throw new Error("No transcript URI")

      // Fetch transcript from the Transcribe-provided URL
      const transcriptRes = await fetch(transcriptUri)
      const transcriptData = await transcriptRes.json()
      return transcriptData.results?.transcripts?.[0]?.transcript || ""
    }

    if (status === "FAILED") {
      const reason = result.TranscriptionJob?.FailureReason || "Unknown reason"
      console.error("Transcription failed:", reason)
      throw new Error(`Transcription failed: ${reason}`)
    }
  }
  throw new Error("Transcription timeout")
}

// Helper: call Nova Pro on Bedrock
async function callNova(prompt: string): Promise<string> {
  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: process.env.BEDROCK_MODEL_ID || "amazon.nova-pro-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      messages: [{
        role: "user",
        content: [{ text: prompt }]
      }]
    })
  }))

  const result = JSON.parse(Buffer.from(response.body).toString())
  return result.output.message.content[0].text
}

// Helper: call Titan or Nova Canvas on Bedrock for image generation
async function generateThumbnail(prompt: string): Promise<Buffer> {
  const modelId = process.env.BEDROCK_IMAGE_MODEL || "amazon.nova-canvas-v1:0"
  console.log(`Generating thumbnail with model: ${modelId}`)

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
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
    })
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

    // 1. Get video from DynamoDB
    const video = await getVideo(userId, videoId)
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 })

    // 2. Update status to processing
    await updateVideo(userId, videoId, { status: "processing" })

    // 3. Start transcription
    const jobName = `clipflow-${videoId}-${Date.now()}`

    await transcribeClient.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: {
        MediaFileUri: `s3://${process.env.S3_BUCKET_NAME}/${video.s3Key}`
      },
      LanguageCode: "en-US",
    }))

    // 4. Wait for transcription
    const transcript = await waitForTranscription(jobName)

    // 5. Call Nova Pro via Bedrock for all content generation
    const prompt = `You are an expert social media content strategist with deep knowledge of viral content.

A creator has uploaded a video titled: "${video.title}"

Video transcript:
"${transcript.slice(0, 3000)}"

Generate optimized content for each platform. Return ONLY a valid JSON object with this exact structure:

{
  "youtube": {
    "title": "engaging YouTube title under 60 chars",
    "description": "detailed YouTube description 150-200 words with value, timestamps mentioned, and call to action",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
  },
  "instagram": {
    "caption": "Instagram caption 100-150 words with storytelling and line breaks",
    "reels_caption": "short punchy version under 100 chars for Reels"
  },
  "twitter": {
    "tweet": "Twitter/X post under 280 chars with impact",
    "thread_starter": "thread version first tweet"
  },
  "linkedin": {
    "post": "professional LinkedIn post 150-200 words with insights and professional value"
  },
  "hashtags": {
    "general": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
    "niche": ["niche1", "niche2", "niche3", "niche4", "niche5"],
    "trending": ["trend1", "trend2", "trend3"]
  },
  "viralScore": {
    "score": 75,
    "reasoning": "2-3 sentences explaining why this content will or won't perform well",
    "improvements": ["improvement tip 1", "improvement tip 2", "improvement tip 3"]
  },
  "keyMoments": [
    {"timestamp": "0:30", "description": "key moment description", "clipWorthy": true},
    {"timestamp": "1:45", "description": "key moment description", "clipWorthy": false}
  ]
}`

    const aiResponse = await callNova(prompt)

    // 6. Parse AI response
    let aiContent
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiContent = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      aiContent = null
    }

    if (!aiContent) {
      await updateVideo(userId, videoId, {
        status: "ready",
        transcript: transcript.slice(0, 5000),
        error: "AI parsing failed, using defaults"
      })
      return NextResponse.json({ success: true, note: "Used fallback" })
    }

    // 7. Save everything to DynamoDB
    await updateVideo(userId, videoId, {
      status: "ready",
      transcript: transcript.slice(0, 5000),
      youtube: JSON.stringify(aiContent.youtube),
      instagram: JSON.stringify(aiContent.instagram),
      twitter: JSON.stringify(aiContent.twitter),
      linkedin: JSON.stringify(aiContent.linkedin),
      hashtags: JSON.stringify(aiContent.hashtags),
      viralScore: aiContent.viralScore?.score || 50,
      viralReasoning: aiContent.viralScore?.reasoning || "",
      viralImprovements: JSON.stringify(aiContent.viralScore?.improvements || []),
      keyMoments: JSON.stringify(aiContent.keyMoments || []),
    })

    // 8. Generate Thumbnail
    let thumbnailUrl = null
    try {
      const themes = aiContent.hashtags?.general || []
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

      // We'll use a presigned URL format or a regional public URL
      thumbnailUrl = thumbKey
      await updateVideo(userId, videoId, { thumbnailUrl })
    } catch (thumbErr) {
      console.error("Thumbnail generation failed:", thumbErr)
    }

    return NextResponse.json({
      success: true,
      viralScore: aiContent.viralScore?.score,
      thumbnailUrl
    })

  } catch (error: any) {
    console.error("Processing error:", error)

    // We try to update error status on a best-effort basis if we've successfully got the session earlier.
    // However, if we're hitting the catch block, we don't have scope of `userId` readily if it failed before instantiation. 
    // We will do a generic fail log here.
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}