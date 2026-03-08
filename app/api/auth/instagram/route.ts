import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const clientId = process.env.INSTAGRAM_CLIENT_ID
    const baseUrl = "https://postable-aws-prototype-zeta.vercel.app"
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`
    console.log("[Instagram OAuth] Redirecting to Meta. URI:", redirectUri)

    if (!clientId) {
        return NextResponse.json({ error: "Instagram OAuth not configured" }, { status: 500 })
    }

    // Use Facebook Login Dialog for Instagram Graph API
    const authUrl = new URL("https://www.facebook.com/v22.0/dialog/oauth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", [
        "instagram_basic",
        "instagram_content_publish",
        "pages_read_engagement",
        "pages_show_list",
        "public_profile"
    ].join(","));

    return NextResponse.redirect(authUrl.toString())
}
