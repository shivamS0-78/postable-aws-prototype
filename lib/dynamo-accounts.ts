import { PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
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
