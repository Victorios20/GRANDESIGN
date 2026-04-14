import { NextRequest, NextResponse } from "next/server"
import { BudgetSnapshotService } from "@/services/budget-snapshot.service"
import { getServerSession } from "next-auth"

// Just a type placeholder if auth options are needed, or we import authOptions
// For now assuming basic session check or no manual auth check inside this specific snipped 
// (assuming middleware or parent checks, but better to be safe)

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Next.js 15 params are async
) {
    try {
        const { id: obraIdStr } = await params
        const obraId = Number(obraIdStr)

        // TODO: Get User ID from session for audit log
        // const session = await getServerSession(...)
        // const userId = session?.user?.id 
        const userId = undefined // passing undefined for now as we didn't setup full auth context logic in this snippet

        if (isNaN(obraId)) {
            return NextResponse.json({ error: "Invalid Obra ID" }, { status: 400 })
        }

        await BudgetSnapshotService.regenerateBaseline(obraId, userId)

        return NextResponse.json({ success: true, message: "Orçamento recalculado com sucesso." })
    } catch (error: any) {
        console.error("Error recalculating budget:", error)
        return NextResponse.json(
            { error: error?.message || "Error processing request" },
            { status: 500 }
        )
    }
}
