import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3Client } from "@/lib/aws"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json()
    const videoId = uuidv4()
    const s3Key = `videos/${videoId}/${filename}`

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({ uploadUrl, videoId, s3Key })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}