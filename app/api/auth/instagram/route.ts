import { NextResponse } from "next/server"

export async function GET() {
    const clientId = process.env.INSTAGRAM_CLIENT_ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000"
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`

    if (!clientId) {
        return NextResponse.json({ error: "Instagram OAuth not configured" }, { status: 500 })
    }

    // Using Instagram User Access Token flow (does not require a linked Facebook Page)
    const authUrl = new URL("https://api.instagram.com/oauth/authorize");
    authUrl.searchParams.set("client_id", process.env.INSTAGRAM_CLIENT_ID!);
    authUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/instagram/callback`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");

    return NextResponse.redirect(authUrl.toString())
}
