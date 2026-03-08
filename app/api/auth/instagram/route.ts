import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const clientId = process.env.INSTAGRAM_CLIENT_ID
    const baseUrl = "https://postable-aws-prototype-zeta.vercel.app"
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`
    console.log("[Instagram OAuth] Redirecting to Meta. URI:", redirectUri)

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
