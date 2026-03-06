import { NextResponse } from "next/server"

export async function GET() {
    const clientId = process.env.INSTAGRAM_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/instagram/callback`

    if (!clientId) {
        return NextResponse.json({ error: "Instagram OAuth not configured" }, { status: 500 })
    }

    // Use the Instagram-specific OAuth endpoint for Business Login
    const authUrl = new URL("https://www.instagram.com/oauth/authorize")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages")

    return NextResponse.redirect(authUrl.toString())
}
