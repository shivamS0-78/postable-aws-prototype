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
    const baseUrl = req.nextUrl.origin

    if (error || !code) {
        return NextResponse.redirect(`${baseUrl}/settings?error=linkedin_denied`)
    }

    try {
        const params = new URLSearchParams()
        params.append("grant_type", "authorization_code")
        params.append("code", code)
        params.append("client_id", process.env.LINKEDIN_CLIENT_ID!)
        params.append("client_secret", process.env.LINKEDIN_CLIENT_SECRET!)
        params.append("redirect_uri", `${baseUrl}/api/auth/linkedin/callback`)

        console.log("-> Starting LinkedIn token exchange")
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: params.toString(),
        })

        const tokens = await tokenRes.json()
        console.log("-> LinkedIn token response status:", tokenRes.status)

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

        await saveConnectedAccount(userId, {
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
