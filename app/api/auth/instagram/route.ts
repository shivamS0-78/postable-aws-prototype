import { NextResponse } from "next/server"

export async function GET() {
    const clientId = process.env.INSTAGRAM_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/instagram/callback`

    if (!clientId) {
        return NextResponse.json({ error: "Instagram OAuth not configured" }, { status: 500 })
    }

    const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "instagram_basic,instagram_content_publish,pages_show_list")

    return NextResponse.redirect(authUrl.toString())
}
