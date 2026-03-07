import { NextRequest, NextResponse } from "next/server"
import { getConnectedAccounts, deleteConnectedAccount } from "@/lib/dynamo-accounts"
import { getUserSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const session = await getUserSession()
        if (!session || !session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accounts = await getConnectedAccounts(session.userId as string)
        // Return only safe fields (no tokens)
        const safeAccounts = accounts.map(a => ({
            platform: a.platform,
            username: a.username,
            connectedAt: a.connectedAt,
        }))
        return NextResponse.json({ accounts: safeAccounts })
    } catch (error: any) {
        return NextResponse.json({ accounts: [] })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getUserSession()
        if (!session || !session.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { platform } = await req.json()
        if (!platform) {
            return NextResponse.json({ error: "Platform is required" }, { status: 400 })
        }

        await deleteConnectedAccount(session.userId as string, platform)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
