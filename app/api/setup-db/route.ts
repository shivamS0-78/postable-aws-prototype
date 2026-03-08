import { NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb"

const client = new DynamoDBClient({
    region: process.env.MY_AWS_REGION!,
    credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
    }
})

export async function GET(req: NextRequest) {
    try {
        const t1 = "postable-users-accounts"
        const t2 = "postable-connected-accounts"

        let schema1 = "Not Found"
        let schema2 = "Not Found"

        try {
            const r1 = await client.send(new DescribeTableCommand({ TableName: t1 }))
            schema1 = JSON.stringify(r1.Table?.KeySchema)
        } catch (e) { }

        try {
            const r2 = await client.send(new DescribeTableCommand({ TableName: t2 }))
            schema2 = JSON.stringify(r2.Table?.KeySchema)
        } catch (e) { }

        return NextResponse.json({
            [t1]: JSON.parse(schema1 === "Not Found" ? 'null' : schema1),
            [t2]: JSON.parse(schema2 === "Not Found" ? 'null' : schema2)
        })

    } catch (error: any) {
        console.error("Failed:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
