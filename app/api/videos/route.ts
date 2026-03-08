import { NextRequest, NextResponse } from "next/server"
import { saveVideo, getAllVideos } from "@/lib/dynamo"
import { getUserSession } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      instagram: null,
      twitter: null,
      linkedin: null,
      hashtags: null,
      transcript: null,
    }

    await saveVideo(session.userId as string, video)
    return NextResponse.json({ success: true, video })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const videos = await getAllVideos(session.userId as string)
    videos.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ videos })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}