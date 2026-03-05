import { NextRequest, NextResponse } from "next/server"
import { saveConnectedAccount } from "@/lib/dynamo-accounts"

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code")
    const error = req.nextUrl.searchParams.get("error")
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    if (error || !code) {
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_denied`)
    }

    try {
        // Exchange code for short-lived token via Facebook Graph API
        const tokenRes = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.INSTAGRAM_CLIENT_ID!,
                client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
                redirect_uri: `${baseUrl}/api/auth/instagram/callback`,
                grant_type: "authorization_code",
            }),
        })

        const tokens = await tokenRes.json()

        if (!tokenRes.ok) {
            console.error("Instagram token exchange failed:", tokens)
            return NextResponse.redirect(`${baseUrl}/settings?error=instagram_token_failed`)
        }

        // Exchange short-lived token for long-lived token
        let longLivedToken = tokens.access_token
        try {
            const longLivedRes = await fetch(
                `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_CLIENT_ID}&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&fb_exchange_token=${tokens.access_token}`
            )
            const longLivedData = await longLivedRes.json()
            if (longLivedData.access_token) {
                longLivedToken = longLivedData.access_token
            }
        } catch {
            // Fall back to short-lived token
        }

        // Fetch Instagram user info via Facebook Graph API
        let username = "Instagram User"
        try {
            // First get pages connected to the user
            const pagesRes = await fetch(
                `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`
            )
            const pagesData = await pagesRes.json()

            if (pagesData.data && pagesData.data.length > 0) {
                // Get Instagram Business Account linked to the first page
                const pageId = pagesData.data[0].id
                const igRes = await fetch(
                    `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account{username}&access_token=${longLivedToken}`
                )
                const igData = await igRes.json()
                if (igData.instagram_business_account?.username) {
                    username = `@${igData.instagram_business_account.username}`
                } else {
                    username = pagesData.data[0].name || "Instagram User"
                }
            }
        } catch {
            // Fallback
        }

        await saveConnectedAccount({
            platform: "instagram",
            accessToken: longLivedToken,
            username,
            connectedAt: new Date().toISOString(),
        })

        return NextResponse.redirect(`${baseUrl}/settings?connected=instagram`)
    } catch (err: any) {
        console.error("Instagram OAuth callback error:", err)
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_failed`)
    }
}
