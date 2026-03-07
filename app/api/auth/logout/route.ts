import { NextResponse } from "next/server"
import { deleteSession } from "@/lib/auth"

export async function POST() {
    try {
        await deleteSession()
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}
