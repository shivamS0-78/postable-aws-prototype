import { NextRequest, NextResponse } from "next/server"
import { saveConnectedAccount } from "@/lib/dynamo-accounts"
import { getUserSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
    const session = await getUserSession()
    if (!session || !session.userId) {
        return NextResponse.redirect(new URL("/login", req.url))
    }
    const userId = session.userId as string

    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = req.nextUrl.searchParams.get("error")
    const baseUrl = "https://postable-aws-prototype-zeta.vercel.app"
    console.log("[YouTube OAuth] Callback received. BaseURL:", baseUrl, "Code present:", !!code)

    if (error || !code) {
        console.error("[YouTube OAuth] Google returned error or no code:", error)
        return NextResponse.redirect(`${baseUrl}/settings?error=youtube_denied`)
    }

    try {
        // Exchange authorization code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${baseUrl}/api/auth/youtube/callback`,
                grant_type: "authorization_code",
            }),
        })

        const tokens = await tokenRes.json()

        if (!tokenRes.ok) {
            console.error("[YouTube OAuth] Token exchange failed. Status:", tokenRes.status, "Tokens:", tokens)
            return NextResponse.redirect(`${baseUrl}/settings?error=youtube_token_failed`)
        }

        // Fetch user's YouTube channel info
        let username = "YouTube User"
        try {
            const profileRes = await fetch(
                "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
                { headers: { Authorization: `Bearer ${tokens.access_token}` } }
            )
            const profileData = await profileRes.json()
            if (profileData.items && profileData.items.length > 0) {
                username = profileData.items[0].snippet.title
            }
        } catch {
            // Fallback — use generic name if channel fetch fails
        }

        // Save to DynamoDB
        await saveConnectedAccount(userId, {
            platform: "youtube",
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || "",
            tokenExpiry: tokens.expires_in
                ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                : undefined,
            username,
            connectedAt: new Date().toISOString(),
        })

        return NextResponse.redirect(`${baseUrl}/settings?connected=youtube`)
    } catch (err: any) {
        console.error("[YouTube OAuth] CRITICAL FALLBACK ERROR:", err)
        return NextResponse.redirect(`${baseUrl}/settings?error=youtube_failed`)
    }
}
