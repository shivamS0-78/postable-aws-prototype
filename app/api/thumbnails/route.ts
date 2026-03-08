import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/aws"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")

    if (!key) return new NextResponse("Missing key", { status: 400 })

    try {
        const s3Res = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
        }))

        const bytes = await s3Res.Body?.transformToByteArray()
        if (!bytes) return new NextResponse("Empty body", { status: 404 })

        return new NextResponse(Buffer.from(bytes), {
            headers: {
                "Content-Type": s3Res.ContentType || "image/png",
                "Cache-Control": "public, max-age=31536000, immutable",
            }
        })
    } catch (error: any) {
        console.error("Thumbnail proxy error:", error)
        return new NextResponse("Not found", { status: 404 })
    }
}
