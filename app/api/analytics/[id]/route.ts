import { NextRequest, NextResponse } from "next/server"
import { getVideo, updateVideo } from "@/lib/dynamo"

function generateAnalytics(viralScore: number) {
  const multiplier = viralScore / 50
  return {
    youtube: {
      views: Math.floor(15000 * multiplier + Math.random() * 5000),
      likes: Math.floor(800 * multiplier + Math.random() * 200),
      comments: Math.floor(120 * multiplier + Math.random() * 50),
      shares: Math.floor(200 * multiplier + Math.random() * 100),
      watchTime: Math.floor(65 + Math.random() * 20),
    },
    tiktok: {
      views: Math.floor(45000 * multiplier + Math.random() * 20000),
      likes: Math.floor(3200 * multiplier + Math.random() * 1000),
      comments: Math.floor(450 * multiplier + Math.random() * 100),
      shares: Math.floor(800 * multiplier + Math.random() * 300),
      watchTime: Math.floor(55 + Math.random() * 30),
    },
    instagram: {
      views: Math.floor(12000 * multiplier + Math.random() * 3000),
      likes: Math.floor(1100 * multiplier + Math.random() * 400),
      comments: Math.floor(80 * multiplier + Math.random() * 30),
      shares: Math.floor(150 * multiplier + Math.random() * 50),
      watchTime: Math.floor(50 + Math.random() * 25),
    },
    twitter: {
      views: Math.floor(8000 * multiplier + Math.random() * 2000),
      likes: Math.floor(400 * multiplier + Math.random() * 150),
      comments: Math.floor(60 * multiplier + Math.random() * 20),
      shares: Math.floor(250 * multiplier + Math.random() * 100),
      watchTime: Math.floor(30 + Math.random() * 20),
    },
    linkedin: {
      views: Math.floor(5000 * multiplier + Math.random() * 2000),
      likes: Math.floor(300 * multiplier + Math.random() * 100),
      comments: Math.floor(45 * multiplier + Math.random() * 20),
      shares: Math.floor(120 * multiplier + Math.random() * 50),
      watchTime: Math.floor(70 + Math.random() * 20),
    },
    trend: Array.from({ length: 7 }, (_, i) => ({
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      views: Math.floor(3000 * multiplier * (1 + i * 0.1) + Math.random() * 1000),
      engagement: Math.floor(200 * multiplier * (1 + i * 0.05) + Math.random() * 100),
    }))
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await getVideo(params.id)
    if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let analytics = video.analyticsData ? JSON.parse(video.analyticsData) : null

    if (!analytics && video.status === "ready") {
      analytics = generateAnalytics(video.viralScore || 50)
      await updateVideo(params.id, { 
        analyticsData: JSON.stringify(analytics),
        status: "published"
      })
    }

    return NextResponse.json({ analytics, video })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}