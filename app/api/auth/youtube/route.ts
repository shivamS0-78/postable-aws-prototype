import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const baseUrl = "https://postable-aws-prototype-zeta.vercel.app"
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`
    console.log("[YouTube OAuth] Redirecting to Google. URI:", redirectUri)

    if (!clientId) {
        return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })
    }

    const scopes = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ")

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", scopes)
    authUrl.searchParams.set("access_type", "offline")
    authUrl.searchParams.set("prompt", "consent")

    return NextResponse.redirect(authUrl.toString())
}
