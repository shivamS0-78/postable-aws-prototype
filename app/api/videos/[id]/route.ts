import { NextRequest, NextResponse } from "next/server"
import { getVideo, deleteVideo } from "@/lib/dynamo"
import { getUserSession } from "@/lib/auth"
import { s3Client } from "@/lib/aws"
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const BUCKET = process.env.S3_BUCKET_NAME || "postly-videos-123"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const video = await getVideo(session.userId as string, id)
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Generate a signed URL for the video if it has an s3Key
    let videoUrl = null
    if (video.s3Key) {
      try {
        const command = new GetObjectCommand({
          Bucket: BUCKET,
          Key: video.s3Key,
        })
        videoUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // Valid for 1 hour
      } catch (e) {
        console.error("Error generating signed URL:", e)
      }
    }

    return NextResponse.json({
      video: {
        ...video,
        videoUrl
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const video = await getVideo(session.userId as string, id)
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Delete from S3
    if (video.s3Key) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: video.s3Key,
      }))
    }

    // Delete from DynamoDB
    await deleteVideo(session.userId as string, id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}