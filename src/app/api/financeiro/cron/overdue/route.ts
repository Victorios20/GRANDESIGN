import { NextResponse } from "next/server"
import { updateOverdueStatus } from "@/actions/financeiro/automation/update-overdue"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    // Security Check
    const authHeader = req.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || 'dev-secret' // Fallback for dev

    if (authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const result = await updateOverdueStatus()
        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
