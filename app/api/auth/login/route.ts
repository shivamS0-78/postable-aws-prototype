import { NextRequest, NextResponse } from "next/server"
import { createSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
        }

        // For MVP demo purposes, we accept any credentials
        // and use the email string (lowercased) as the consistent unique userId.
        const userId = email.toLowerCase().trim()

        // Generate the 7-day JWT and issue HTTP-only cookie
        await createSession(userId)

        return NextResponse.json({ success: true, userId })

    } catch (error: any) {
        console.error("Login API Error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
