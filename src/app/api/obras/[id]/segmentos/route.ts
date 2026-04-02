// src/app/api/obras/[id]/segmentos/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { fromDateOnlyDb, parseDateOnlyInput } from "@/lib/date-only"

export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

/**
 * POST /api/obras/:id/segmentos
 * Create a new segment for a obra
 * Body: { equipe_id?, inicio, fim, observacoes? }
 */
export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
        }

        // Check permissions (ADMIN or GERENTE can create)
        const userRoles = (session.user as any)?.roles || []
        const canEdit = userRoles.some((r: string) =>
            ["ADMIN", "GERENTE"].includes(r.toUpperCase())
        )
        if (!canEdit) {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
        }

        const { id: idStr } = await params
        const obraId = Number(idStr)
        if (!Number.isFinite(obraId)) {
            return NextResponse.json({ error: "ID de obra inválido" }, { status: 400 })
        }

        // Verify obra exists
        const obra = await prisma.obras.findUnique({ where: { id: obraId } })
        if (!obra) {
            return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 })
        }

        const body = await req.json()
        const { equipe_id, inicio, fim, observacoes } = body

        if (!inicio || !fim) {
            return NextResponse.json({ error: "Datas início e fim são obrigatórias" }, { status: 400 })
        }

        const inicioDate = parseDateOnlyInput(inicio)
        const fimDate = parseDateOnlyInput(fim)
        if (!inicioDate || !fimDate) {
            return NextResponse.json({ error: "Datas invalidas" }, { status: 400 })
        }

        if (inicioDate > fimDate) {
            return NextResponse.json({ error: "Data fim deve ser maior ou igual à data início" }, { status: 400 })
        }

        // Check for equipe conflict (soft warning)
        let conflictWarning: string | null = null
        if (equipe_id) {
            const conflicts = await prisma.obraAgendaSegmento.findMany({
                where: {
                    equipe_id: Number(equipe_id),
                    AND: [
                        { inicio: { lte: fimDate } },
                        { fim: { gte: inicioDate } },
                    ],
                },
                include: {
                    obra: { select: { titulo: true } },
                },
            })

            if (conflicts.length > 0) {
                const titles = conflicts.map((c) => c.obra.titulo || `Obra #${c.obra_id}`).join(", ")
                conflictWarning = `Conflito com: ${titles}`
            }
        }

        // Create segment
        const created = await prisma.obraAgendaSegmento.create({
            data: {
                obra_id: obraId,
                equipe_id: equipe_id ? Number(equipe_id) : null,
                inicio: inicioDate,
                fim: fimDate,
                observacoes: observacoes || null,
            },
            include: {
                equipe: { select: { id: true, nome: true, cor: true } },
            },
        })

        return NextResponse.json({
            data: {
                id: created.id,
                obra_id: created.obra_id,
                equipe_id: created.equipe_id,
                inicio: fromDateOnlyDb(created.inicio)!,
                fim: fromDateOnlyDb(created.fim)!,
                observacoes: created.observacoes,
                equipe: created.equipe,
            },
            warning: conflictWarning,
        }, { status: 201 })
    } catch (err) {
        console.error("Segmento POST error:", err)
        return NextResponse.json({ error: "Falha ao criar segmento" }, { status: 500 })
    }
}

/**
 * GET /api/obras/:id/segmentos
 * List all segments for a obra
 */
export async function GET(_req: Request, { params }: { params: Params }) {
    try {
        const { id: idStr } = await params
        const obraId = Number(idStr)
        if (!Number.isFinite(obraId)) {
            return NextResponse.json({ error: "ID de obra inválido" }, { status: 400 })
        }

        const segmentos = await prisma.obraAgendaSegmento.findMany({
            where: { obra_id: obraId },
            include: {
                equipe: { select: { id: true, nome: true, cor: true } },
            },
            orderBy: { inicio: "asc" },
        })

        const formatted = segmentos.map((s) => ({
            id: s.id,
            obra_id: s.obra_id,
            equipe_id: s.equipe_id,
            inicio: fromDateOnlyDb(s.inicio)!,
            fim: fromDateOnlyDb(s.fim)!,
            observacoes: s.observacoes,
            equipe: s.equipe,
        }))

        return NextResponse.json({ data: formatted })
    } catch (err) {
        console.error("Segmentos GET error:", err)
        return NextResponse.json({ error: "Falha ao listar segmentos" }, { status: 500 })
    }
}
