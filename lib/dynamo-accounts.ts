import { PutCommand, ScanCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { dynamoDocClient } from "./aws"

const TABLE = process.env.DYNAMODB_ACCOUNTS_TABLE || "postable-connected-accounts"

export interface ConnectedAccountRecord {
    platform: string        // "youtube" | "instagram" | "linkedin"
    accessToken: string
    refreshToken?: string
    tokenExpiry?: string
    username: string
    profileUrl?: string
    connectedAt: string
}

export async function saveConnectedAccount(account: ConnectedAccountRecord) {
    await dynamoDocClient.send(new PutCommand({
        TableName: TABLE,
        Item: account,
    }))
}

export async function getConnectedAccounts(): Promise<ConnectedAccountRecord[]> {
    const result = await dynamoDocClient.send(new ScanCommand({
        TableName: TABLE,
    }))
    return (result.Items || []) as ConnectedAccountRecord[]
}

export async function deleteConnectedAccount(platform: string) {
    await dynamoDocClient.send(new DeleteCommand({
        TableName: TABLE,
        Key: { platform },
    }))
}

/**
 * Checks if a token is expired or about to expire (within 5 minutes).
 */
function isTokenExpired(tokenExpiry?: string): boolean {
    if (!tokenExpiry) return true // No expiry stored = assume expired
    const expiryTime = new Date(tokenExpiry).getTime()
    const now = Date.now()
    const BUFFER_MS = 5 * 60 * 1000 // 5 minutes buffer
    return now >= expiryTime - BUFFER_MS
}

/**
 * Updates the access token and expiry in DynamoDB for a platform.
 */
async function updateAccessToken(platform: string, accessToken: string, expiresIn: number) {
    const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()
    await dynamoDocClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { platform },
        UpdateExpression: "SET accessToken = :at, tokenExpiry = :te",
        ExpressionAttributeValues: {
            ":at": accessToken,
            ":te": newExpiry,
        },
    }))
}

/**
 * Refreshes the access token using the stored refresh token for Google/YouTube.
 * Returns the new access token, or throws if refresh fails.
 */
async function refreshGoogleAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    })

    const data = await res.json()

    if (!res.ok) {
        console.error("Google token refresh failed:", data)
        throw new Error(`Token refresh failed: ${data.error_description || data.error || "Unknown error"}`)
    }

    return { access_token: data.access_token, expires_in: data.expires_in || 3600 }
}

/**
 * Returns a valid (non-expired) access token for the given account.
 * Automatically refreshes the token if expired and updates DynamoDB.
 */
export async function getValidAccessToken(account: ConnectedAccountRecord): Promise<string> {
    // If token is still valid, return it directly
    if (!isTokenExpired(account.tokenExpiry)) {
        return account.accessToken
    }

    // Token is expired — try to refresh
    if (!account.refreshToken) {
        throw new Error(`Access token expired for ${account.platform} and no refresh token available. Please reconnect the account in Settings.`)
    }

    console.log(`[Token Refresh] Refreshing expired ${account.platform} access token...`)

    if (account.platform === "youtube") {
        const { access_token, expires_in } = await refreshGoogleAccessToken(account.refreshToken)
        // Update in DynamoDB so we don't need to refresh again next time
        await updateAccessToken(account.platform, access_token, expires_in)
        console.log(`[Token Refresh] Successfully refreshed ${account.platform} token, expires in ${expires_in}s`)
        return access_token
    }

    // For other platforms (linkedin, instagram), add refresh logic here as needed
    throw new Error(`Token refresh not implemented for ${account.platform}. Please reconnect the account in Settings.`)
}
