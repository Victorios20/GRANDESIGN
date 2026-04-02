// src/app/api/obras/[id]/segmentos/route.ts
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { fromDateOnlyDb, parseDateOnlyInput } from "@/lib/date-only"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

type SaveAgendaSegmentInput = {
    id?: number
    start: string
    end: string
    equipeId: number | null
    tipo?: string
    status?: string
    observacoes?: string | null
}

async function requireEditUser() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return { ok: false as const, response: NextResponse.json({ error: "NÃ£o autenticado" }, { status: 401 }) }
    }

    const userRoles = (session.user as any)?.roles || []
    const canEdit = userRoles.some((r: string) => ["ADMIN", "GERENTE"].includes(r.toUpperCase()))
    if (!canEdit) {
        return { ok: false as const, response: NextResponse.json({ error: "Sem permissÃ£o" }, { status: 403 }) }
    }

    return { ok: true as const, userId: Number((session.user as any)?.id) || null }
}

/**
 * POST /api/obras/:id/segmentos
 * Create a new segment for a obra
 * Body: { equipe_id?, inicio, fim, observacoes? }
 */
export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const permission = await requireEditUser()
        if (!permission.ok) {
            return permission.response
        }

        const { id: idStr } = await params
        const obraId = Number(idStr)
        if (!Number.isFinite(obraId)) {
            return NextResponse.json({ error: "ID de obra invÃ¡lido" }, { status: 400 })
        }

        const obra = await prisma.obras.findUnique({ where: { id: obraId } })
        if (!obra) {
            return NextResponse.json({ error: "Obra nÃ£o encontrada" }, { status: 404 })
        }

        const body = await req.json()
        const { equipe_id, inicio, fim, observacoes } = body

        if (!inicio || !fim) {
            return NextResponse.json({ error: "Datas inÃ­cio e fim sÃ£o obrigatÃ³rias" }, { status: 400 })
        }

        const inicioDate = parseDateOnlyInput(inicio)
        const fimDate = parseDateOnlyInput(fim)
        if (!inicioDate || !fimDate) {
            return NextResponse.json({ error: "Datas invalidas" }, { status: 400 })
        }

        if (inicioDate > fimDate) {
            return NextResponse.json({ error: "Data fim deve ser maior ou igual Ã  data inÃ­cio" }, { status: 400 })
        }

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

        const created = await prisma.obraAgendaSegmento.create({
            data: {
                obra_id: obraId,
                equipe_id: equipe_id ? Number(equipe_id) : null,
                inicio: inicioDate,
                fim: fimDate,
                observacoes: observacoes || null,
                created_by: permission.userId,
                updated_by: permission.userId,
            },
            include: {
                equipe: { select: { id: true, nome: true, cor: true } },
            },
        })

        revalidatePath(`/obras/${obraId}`)
        revalidatePath("/calendario")

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
            return NextResponse.json({ error: "ID de obra invÃ¡lido" }, { status: 400 })
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

/**
 * PUT /api/obras/:id/segmentos
 * Replace all agenda segments for a obra
 * Body: { segments: AgendaSegmentInput[] }
 */
export async function PUT(req: Request, { params }: { params: Params }) {
    try {
        const permission = await requireEditUser()
        if (!permission.ok) {
            return permission.response
        }

        const { id: idStr } = await params
        const obraId = Number(idStr)
        if (!Number.isFinite(obraId)) {
            return NextResponse.json({ error: "ID de obra invÃ¡lido" }, { status: 400 })
        }

        const obra = await prisma.obras.findUnique({
            where: { id: obraId },
            select: { id: true },
        })
        if (!obra) {
            return NextResponse.json({ error: "Obra nÃ£o encontrada" }, { status: 404 })
        }

        const body = await req.json()
        const segments = Array.isArray(body?.segments) ? body.segments as SaveAgendaSegmentInput[] : null
        if (!segments) {
            return NextResponse.json({ error: "Payload invÃ¡lido" }, { status: 400 })
        }

        for (const seg of segments) {
            if (!seg.start || !seg.end) {
                return NextResponse.json({ error: "Datas de inÃ­cio e fim sÃ£o obrigatÃ³rias em todos os trechos." }, { status: 400 })
            }

            if (seg.start > seg.end) {
                return NextResponse.json(
                    { error: `Data de inÃ­cio (${seg.start}) nÃ£o pode ser maior que o fim (${seg.end}).` },
                    { status: 400 }
                )
            }

            if (!parseDateOnlyInput(seg.start) || !parseDateOnlyInput(seg.end)) {
                return NextResponse.json({ error: "Datas invÃ¡lidas na agenda." }, { status: 400 })
            }
        }

        const sorted = [...segments].sort((a, b) => a.start.localeCompare(b.start))
        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i]
            const next = sorted[i + 1]

            if (current.end >= next.start) {
                return NextResponse.json(
                    {
                        error: `SobreposiÃ§Ã£o detectada entre os trechos: [${current.start} - ${current.end}] e [${next.start} - ${next.end}]`,
                    },
                    { status: 400 }
                )
            }
        }

        await prisma.$transaction(async (tx) => {
            const incomingIds = segments
                .map((segment) => segment.id)
                .filter((id): id is number => typeof id === "number" && id > 0)

            await tx.obraAgendaSegmento.deleteMany({
                where: {
                    obra_id: obraId,
                    id: { notIn: incomingIds },
                },
            })

            for (const seg of segments) {
                const data = {
                    obra_id: obraId,
                    equipe_id: seg.equipeId && seg.equipeId > 0 ? seg.equipeId : null,
                    inicio: parseDateOnlyInput(seg.start)!,
                    fim: parseDateOnlyInput(seg.end)!,
                    observacoes: seg.observacoes ?? null,
                    tipo: seg.tipo || "EXECUCAO",
                    status: seg.status || "AGENDADO",
                    updated_by: permission.userId,
                }

                if (seg.id && seg.id > 0) {
                    await tx.obraAgendaSegmento.update({
                        where: { id: seg.id },
                        data,
                    })
                    continue
                }

                await tx.obraAgendaSegmento.create({
                    data: {
                        ...data,
                        created_by: permission.userId,
                    },
                })
            }
        })

        revalidatePath(`/obras/${obraId}`)
        revalidatePath("/calendario")

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error("Segmentos PUT error:", err)
        const message = err instanceof Error ? err.message : "Falha ao salvar agenda"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
