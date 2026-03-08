import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const origin = req.nextUrl.origin
    const redirectUri = `${origin}/api/auth/linkedin/callback`

    if (!clientId) {
        return NextResponse.json({ error: "LinkedIn OAuth not configured" }, { status: 500 })
    }

    const scopes = ["openid", "profile", "w_member_social"].join(" ")

    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization")
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", scopes)

    return NextResponse.redirect(authUrl.toString())
}
