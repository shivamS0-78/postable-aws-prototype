import { NextRequest, NextResponse } from "next/server"
import { getVideo } from "@/lib/dynamo"

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