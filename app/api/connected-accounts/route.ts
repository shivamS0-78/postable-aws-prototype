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

        let platform = req.nextUrl.searchParams.get("platform")

        // Fallback to body just in case it was sent as JSON
        if (!platform) {
            try {
                const body = await req.json()
                platform = body.platform
            } catch (e) {
                // Ignore json parsing error if body empty
            }
        }

        if (!platform) {
            return NextResponse.json({ error: "Platform is required" }, { status: 400 })
        }

        await deleteConnectedAccount(session.userId as string, platform)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
