import { NextResponse } from "next/server"
import { getUserSession } from "@/lib/auth"

export async function GET() {
    try {
        const session = await getUserSession()
        if (!session || !session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        return NextResponse.json({ user: { email: session.userId } })
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}
