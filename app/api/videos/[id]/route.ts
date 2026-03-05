import { NextRequest, NextResponse } from "next/server"
import { getVideo, deleteVideo } from "@/lib/dynamo"
import { s3Client } from "@/lib/aws"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"

const BUCKET = process.env.S3_BUCKET_NAME || "postly-videos-123"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = await getVideo(id)
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }
    return NextResponse.json({ video })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = await getVideo(id)
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
    await deleteVideo(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}