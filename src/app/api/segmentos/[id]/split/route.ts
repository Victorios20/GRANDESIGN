// src/app/api/segmentos/[id]/split/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

/**
 * POST /api/segmentos/:id/split
 * Split a segment into two at a given date
 * Body: { splitDate: "YYYY-MM-DD" }
 */
export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
        }

        const userRoles = (session.user as any)?.roles || []
        const canEdit = userRoles.some((r: string) =>
            ["ADMIN", "GERENTE"].includes(r.toUpperCase())
        )
        if (!canEdit) {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
        }

        const { id: idStr } = await params
        const id = Number(idStr)
        if (!Number.isFinite(id)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 })
        }

        const body = await req.json()
        const { splitDate } = body

        if (!splitDate) {
            return NextResponse.json({ error: "Data de divisão é obrigatória" }, { status: 400 })
        }

        const splitDateObj = new Date(`${splitDate}T12:00:00`)

        // Find existing segment
        const existing = await prisma.obraAgendaSegmento.findUnique({
            where: { id },
            include: { equipe: { select: { id: true, nome: true, cor: true } } },
        })

        if (!existing) {
            return NextResponse.json({ error: "Segmento não encontrado" }, { status: 404 })
        }

        // Validate splitDate is between inicio and fim (exclusive)
        if (splitDateObj <= existing.inicio || splitDateObj >= existing.fim) {
            return NextResponse.json(
                { error: "Data de divisão deve estar entre início e fim do segmento" },
                { status: 400 }
            )
        }

        // Use transaction to split
        const result = await prisma.$transaction(async (tx) => {
            // Update existing segment to end at splitDate
            const first = await tx.obraAgendaSegmento.update({
                where: { id },
                data: { fim: splitDateObj },
                include: { equipe: { select: { id: true, nome: true, cor: true } } },
            })

            // Create new segment from splitDate to original fim
            const second = await tx.obraAgendaSegmento.create({
                data: {
                    obra_id: existing.obra_id,
                    equipe_id: existing.equipe_id,
                    inicio: splitDateObj,
                    fim: existing.fim,
                    observacoes: existing.observacoes,
                },
                include: { equipe: { select: { id: true, nome: true, cor: true } } },
            })

            return { first, second }
        })

        const format = (s: typeof result.first) => ({
            id: s.id,
            obra_id: s.obra_id,
            equipe_id: s.equipe_id,
            inicio: s.inicio.toISOString().split("T")[0],
            fim: s.fim.toISOString().split("T")[0],
            observacoes: s.observacoes,
            equipe: s.equipe,
        })

        return NextResponse.json({
            data: {
                first: format(result.first),
                second: format(result.second),
            },
        })
    } catch (err) {
        console.error("Segmento SPLIT error:", err)
        return NextResponse.json({ error: "Falha ao dividir segmento" }, { status: 500 })
    }
}
