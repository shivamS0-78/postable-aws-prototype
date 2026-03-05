import { NextRequest, NextResponse } from "next/server"
import { saveVideo, getAllVideos } from "@/lib/dynamo"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const video = {
      id: body.videoId,
      title: body.title,
      s3Key: body.s3Key,
      filename: body.filename,
      status: "uploaded",
      createdAt: new Date().toISOString(),
      viralScore: null,
      youtube: null,
      tiktok: null,
      instagram: null,
      twitter: null,
      linkedin: null,
      hashtags: null,
      transcript: null,
    }
    await saveVideo(video)
    return NextResponse.json({ success: true, video })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const videos = await getAllVideos()
    // Sort by createdAt descending
    videos.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return NextResponse.json({ videos })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}