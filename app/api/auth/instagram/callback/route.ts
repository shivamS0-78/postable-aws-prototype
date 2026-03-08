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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000"

    if (error || !code) {
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_denied`)
    }

    try {
        console.log("-> Starting token exchange with Facebook");

        const tokenUrl = "https://api.instagram.com/oauth/access_token";

        const formData = new URLSearchParams();
        formData.append('client_id', process.env.INSTAGRAM_CLIENT_ID!);
        formData.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!);
        formData.append('grant_type', 'authorization_code');
        formData.append('redirect_uri', `${baseUrl}/api/auth/instagram/callback`);
        formData.append('code', code);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const tokenRes = await fetch(tokenUrl, {
            method: "POST",
            body: formData,
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
        const initialUserId = tokens.user_id; // Instagram API usually returns the user ID here too

        console.log("-> Fetching User Profile & Long Lived Token");
        let username = "Instagram Account";
        let finalAccessToken = shortLivedToken;
        let expiresIn = 5184000;
        let igAccountId = initialUserId || "";

        try {
            // First, exchange for a long lived token
            const longLivedRes = await fetch(
                `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortLivedToken}`
            );
            const longLivedData = await longLivedRes.json();
            if (longLivedData.access_token) {
                finalAccessToken = longLivedData.access_token;
                expiresIn = longLivedData.expires_in || 5184000;
            }

            // Then fetch user's profile
            const profileRes = await fetch(
                `https://graph.instagram.com/v22.0/me?fields=id,username&access_token=${finalAccessToken}`
            );
            const profileData = await profileRes.json();

            if (profileData.username) {
                username = `@${profileData.username}`;
                igAccountId = profileData.id;
            }
        } catch (e) {
            console.error("Profile/Token fetch failed:", e);
        }

        console.log("-> Saving to dynamo:", username);
        const accountData: any = {
            platform: "instagram",
            accessToken: finalAccessToken,
            tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
            username,
            connectedAt: new Date().toISOString(),
        };

        // Save the Instagram Business Account ID as the refresh token field to avoid changing the schema
        // This is a common hack to store platform-specific IDs without altering DynamoDB schemas
        if (igAccountId) {
            accountData.refreshToken = igAccountId;
        }

        await saveConnectedAccount(userId, accountData);
        console.log("-> Dynamo save finished");
        return NextResponse.redirect(`${baseUrl}/settings?connected=instagram`);
    } catch (err: any) {
        console.error("Instagram OAuth callback error:", err);
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_failed`);
    }
}

