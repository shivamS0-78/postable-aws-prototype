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
    const baseUrl = "https://postable-aws-prototype-zeta.vercel.app"

    if (error || !code) {
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_denied`)
    }

    try {
        console.log("-> Starting token exchange with Meta Graph API");

        // 1. Exchange authorization code for User Access Token
        const tokenRes = await fetch("https://graph.facebook.com/v22.0/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.INSTAGRAM_CLIENT_ID!,
                client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
                redirect_uri: `${baseUrl}/api/auth/instagram/callback`,
                code,
            }),
        });

        const tokens = await tokenRes.json();
        if (!tokenRes.ok) {
            console.error("Meta token exchange failed:", tokens);
            return NextResponse.redirect(`${baseUrl}/settings?error=instagram_token_failed`);
        }

        const userAccessToken = tokens.access_token;

        // 2. Fetch User's Pages to find the linked Instagram Business Account
        console.log("-> Fetching linked Instagram Business accounts via Pages");
        const pagesRes = await fetch(
            `https://graph.facebook.com/v22.0/me/accounts?fields=name,instagram_business_account{id,username}&access_token=${userAccessToken}`
        );
        const pagesData = await pagesRes.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            console.error("No Facebook Pages found for this user.");
            return NextResponse.redirect(`${baseUrl}/settings?error=instagram_no_pages`);
        }

        // Find the first page that has an Instagram Business Account linked
        const pageWithIg = pagesData.data.find((p: any) => p.instagram_business_account);

        if (!pageWithIg) {
            console.error("No linked Instagram Business Account found on any Page.");
            return NextResponse.redirect(`${baseUrl}/settings?error=instagram_no_business_account`);
        }

        const igAccount = pageWithIg.instagram_business_account;
        const igAccountId = igAccount.id;
        const username = `@${igAccount.username}`;

        console.log("-> Found Instagram Business Account:", username);

        // 3. Save to DynamoDB
        // For Instagram Graph API, we store the User Access Token as the token
        // and the Instagram Business Account ID as the "refreshToken" (or similar identifier)
        await saveConnectedAccount(userId, {
            platform: "instagram",
            accessToken: userAccessToken,
            username,
            connectedAt: new Date().toISOString(),
            refreshToken: igAccountId, // Store the IG Business ID here
        });

        console.log("-> Instagram connection saved successfully");
        return NextResponse.redirect(`${baseUrl}/settings?connected=instagram`);
    } catch (err: any) {
        console.error("Instagram OAuth callback error:", err);
        return NextResponse.redirect(`${baseUrl}/settings?error=instagram_failed`);
    }
}
