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
    const error = searchParams.get("error")
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    if (error || !code) {
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_denied`)
    }

    try {
        console.log("-> Starting token exchange with Instagram");

        // Use raw application/x-www-form-urlencoded string to strictly bypass Next.js object parsing bugs
        const params = new URLSearchParams();
        params.append('client_id', process.env.INSTAGRAM_CLIENT_ID!);
        params.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', `${baseUrl}/api/auth/instagram/callback`);
        params.append('code', code);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: params.toString(),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        console.log("-> Token exchange completed, status:", tokenRes.status);
        const tokens = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error("Instagram token exchange failed:", tokens);
            return NextResponse.redirect(`${baseUrl}/settings?error=instagram_token_failed`);
        }

        const shortLivedToken = tokens.access_token;
        const userId = tokens.user_id;

        console.log("-> Getting long lived token for:", userId);
        // Exchange short-lived token for long-lived token (60 days)
        let longLivedToken = shortLivedToken;
        let expiresIn = 3600;
        try {
            const longLivedRes = await fetch(
                `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortLivedToken}`
            );
            const longLivedData = await longLivedRes.json();
            if (longLivedData.access_token) {
                longLivedToken = longLivedData.access_token;
                expiresIn = longLivedData.expires_in || 5184000; // 60 days default
            }
        } catch (e) {
            console.error("Long lived token failed:", e);
        }

        console.log("-> Fetching profile");
        // Fetch Instagram user profile
        let username = "Instagram User";
        try {
            const profileRes = await fetch(
                `https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${longLivedToken}`
            );
            const profileData = await profileRes.json();
            if (profileData.username) {
                username = `@${profileData.username}`;
            }
        } catch (e) {
            console.error("Profile fetch failed:", e);
        }

        console.log("-> Saving to dynamo:", username);
        await saveConnectedAccount(userId, {
            platform: "instagram",
            accessToken: longLivedToken,
            tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
            username,
            connectedAt: new Date().toISOString(),
        });
        console.log("-> Dynamo save finished");

        return NextResponse.redirect(`${baseUrl}/settings?connected=instagram`);
    } catch (err: any) {
        console.error("Instagram OAuth callback error:", err);
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_failed`);
    }
}

