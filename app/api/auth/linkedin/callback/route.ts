import { NextRequest, NextResponse } from "next/server"
import { saveConnectedAccount } from "@/lib/dynamo-accounts"

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code")
    const error = req.nextUrl.searchParams.get("error")
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    if (error || !code) {
        return NextResponse.redirect(`${baseUrl}/settings?error=linkedin_denied`)
    }

    try {
        // Exchange authorization code for access token
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: process.env.LINKEDIN_CLIENT_ID!,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
                redirect_uri: `${baseUrl}/api/auth/linkedin/callback`,
            }),
        })

        const tokens = await tokenRes.json()

        if (!tokenRes.ok) {
            console.error("LinkedIn token exchange failed:", tokens)
            return NextResponse.redirect(`${baseUrl}/settings?error=linkedin_token_failed`)
        }

        // Fetch LinkedIn profile using userinfo endpoint (OpenID Connect)
        let username = "LinkedIn User"
        try {
            const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            })
            const profile = await profileRes.json()
            if (profile.name) {
                username = profile.name
            } else if (profile.given_name) {
                username = `${profile.given_name} ${profile.family_name || ""}`.trim()
            }
        } catch {
            // Fallback
        }

        await saveConnectedAccount({
            platform: "linkedin",
            accessToken: tokens.access_token,
            tokenExpiry: tokens.expires_in
                ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                : undefined,
            username,
            connectedAt: new Date().toISOString(),
        })

        return NextResponse.redirect(`${baseUrl}/settings?connected=linkedin`)
    } catch (err: any) {
        console.error("LinkedIn OAuth callback error:", err)
        return NextResponse.redirect(`${baseUrl}/settings?error=linkedin_failed`)
    }
}
