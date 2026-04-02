// src/app/api/segmentos/[id]/split/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { fromDateOnlyDb, parseDateOnlyInput, subtractDaysFromDateOnly } from "@/lib/date-only"

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
            return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
        }

        const userRoles = (session.user as any)?.roles || []
        const canEdit = userRoles.some((r: string) =>
            ["ADMIN", "GERENTE"].includes(r.toUpperCase())
        )
        if (!canEdit) {
            return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
        }

        const { id: idStr } = await params
        const id = Number(idStr)
        if (!Number.isFinite(id)) {
            return NextResponse.json({ error: "ID invalido" }, { status: 400 })
        }

        const body = await req.json()
        const { splitDate } = body

        if (!splitDate) {
            return NextResponse.json({ error: "Data de divisao obrigatoria" }, { status: 400 })
        }

        const splitDateObj = parseDateOnlyInput(splitDate)
        const splitDateYmd = fromDateOnlyDb(splitDateObj)
        if (!splitDateObj || !splitDateYmd) {
            return NextResponse.json({ error: "Data de divisao invalida" }, { status: 400 })
        }

        const existing = await prisma.obraAgendaSegmento.findUnique({
            where: { id },
            include: { equipe: { select: { id: true, nome: true, cor: true } } },
        })

        if (!existing) {
            return NextResponse.json({ error: "Segmento nao encontrado" }, { status: 404 })
        }

        const firstSegmentEnd = parseDateOnlyInput(subtractDaysFromDateOnly(splitDateYmd))
        if (!firstSegmentEnd || splitDateObj <= existing.inicio || splitDateObj > existing.fim || firstSegmentEnd < existing.inicio) {
            return NextResponse.json(
                { error: "Data de divisao deve estar entre inicio e fim do segmento" },
                { status: 400 }
            )
        }

        const result = await prisma.$transaction(async (tx) => {
            const first = await tx.obraAgendaSegmento.update({
                where: { id },
                data: { fim: firstSegmentEnd },
                include: { equipe: { select: { id: true, nome: true, cor: true } } },
            })

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
            inicio: fromDateOnlyDb(s.inicio)!,
            fim: fromDateOnlyDb(s.fim)!,
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
