import { NextRequest, NextResponse } from "next/server"
import { BudgetSnapshotService } from "@/services/budget-snapshot.service"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

type SessionLike =
    | { user?: { id?: string | number | null } | null; userId?: string | number | null }
    | null
    | undefined

function getActorId(session: SessionLike): number | null {
    const raw = session?.user?.id ?? session?.userId
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Next.js 15 params are async
) {
    try {
        const session = (await getServerSession(authOptions)) as SessionLike
        const userId = getActorId(session)
        if (!userId) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 })
        }

        const { id: obraIdStr } = await params
        const obraId = Number(obraIdStr)

        if (isNaN(obraId)) {
            return NextResponse.json({ error: "Invalid Obra ID" }, { status: 400 })
        }

        const body = await request.json().catch(() => null)
        if (body?.confirm !== true) {
            return NextResponse.json(
                { error: "CONFIRMATION_REQUIRED", message: "Confirme o reset do baseline para sobrescrever os valores previstos manuais." },
                { status: 400 }
            )
        }

        await BudgetSnapshotService.regenerateBaseline(obraId, userId)

        return NextResponse.json({ success: true, message: "Orçamento recalculado com sucesso." })
    } catch (error: unknown) {
        console.error("Error recalculating budget:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error processing request" },
            { status: 500 }
        )
    }
}
