import { NextRequest, NextResponse } from "next/server"
import { getConnectedAccounts, deleteConnectedAccount } from "@/lib/dynamo-accounts"

export async function GET() {
    try {
        const accounts = await getConnectedAccounts()
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
        const platform = req.nextUrl.searchParams.get("platform")
        if (!platform) {
            return NextResponse.json({ error: "Platform is required" }, { status: 400 })
        }
        await deleteConnectedAccount(platform)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
