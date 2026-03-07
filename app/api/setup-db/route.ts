import { NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb"

const client = new DynamoDBClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
})

export async function GET(req: NextRequest) {
    const tableName = "postable-users-accounts"

    try {
        // Check if table already exists
        let exists = false
        try {
            await client.send(new DescribeTableCommand({ TableName: tableName }))
            exists = true
        } catch (e: any) {
            if (e.name !== "ResourceNotFoundException") {
                throw e
            }
        }

        if (exists) {
            return NextResponse.json({ success: true, message: `Table '${tableName}' already exists.` })
        }

        console.log(`Creating DynamoDB table: ${tableName}...`)

        await client.send(new CreateTableCommand({
            TableName: tableName,
            AttributeDefinitions: [
                { AttributeName: "userId", AttributeType: "S" },
                { AttributeName: "platform", AttributeType: "S" }
            ],
            KeySchema: [
                { AttributeName: "userId", KeyType: "HASH" }, // Partition key
                { AttributeName: "platform", KeyType: "RANGE" } // Sort key
            ],
            BillingMode: "PAY_PER_REQUEST"
        }))

        return NextResponse.json({ success: true, message: `Successfully requested creation of '${tableName}'. It will be active momentarily.` })

    } catch (error: any) {
        console.error("Failed to create table:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
