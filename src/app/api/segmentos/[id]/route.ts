// src/app/api/segmentos/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

async function checkEditPermission(): Promise<{ allowed: boolean; error?: NextResponse }> {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return { allowed: false, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
    }

    const userRoles = (session.user as any)?.roles || []
    const canEdit = userRoles.some((r: string) =>
        ["ADMIN", "GERENTE"].includes(r.toUpperCase())
    )
    if (!canEdit) {
        return { allowed: false, error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) }
    }

    return { allowed: true }
}

/**
 * GET /api/segmentos/:id
 */
export async function GET(_req: Request, { params }: { params: Params }) {
    try {
        const { id: idStr } = await params
        const id = Number(idStr)
        if (!Number.isFinite(id)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 })
        }

        const segmento = await prisma.obraAgendaSegmento.findUnique({
            where: { id },
            include: {
                equipe: { select: { id: true, nome: true, cor: true } },
                obra: {
                    select: {
                        id: true,
                        titulo: true,
                        status: true,
                    },
                },
            },
        })

        if (!segmento) {
            return NextResponse.json({ error: "Segmento não encontrado" }, { status: 404 })
        }

        return NextResponse.json({
            data: {
                id: segmento.id,
                obra_id: segmento.obra_id,
                equipe_id: segmento.equipe_id,
                inicio: segmento.inicio.toISOString().split("T")[0],
                fim: segmento.fim.toISOString().split("T")[0],
                observacoes: segmento.observacoes,
                equipe: segmento.equipe,
                obra: segmento.obra,
            },
        })
    } catch (err) {
        console.error("Segmento GET error:", err)
        return NextResponse.json({ error: "Falha ao buscar segmento" }, { status: 500 })
    }
}

/**
 * PATCH /api/segmentos/:id
 * Update segment dates, equipe, observacoes
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
    try {
        const perm = await checkEditPermission()
        if (!perm.allowed) return perm.error

        const { id: idStr } = await params
        const id = Number(idStr)
        if (!Number.isFinite(id)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 })
        }

        const existing = await prisma.obraAgendaSegmento.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: "Segmento não encontrado" }, { status: 404 })
        }

        const body = await req.json()
        const { equipe_id, inicio, fim, observacoes } = body

        const data: any = {}

        if (inicio !== undefined) data.inicio = new Date(`${inicio}T12:00:00`)
        if (fim !== undefined) data.fim = new Date(`${fim}T12:00:00`)
        if (equipe_id !== undefined) data.equipe_id = equipe_id ? Number(equipe_id) : null
        if (observacoes !== undefined) data.observacoes = observacoes

        // Validate dates if both provided
        const newInicio = data.inicio || existing.inicio
        const newFim = data.fim || existing.fim
        if (newInicio > newFim) {
            return NextResponse.json({ error: "Data fim deve ser maior ou igual à data início" }, { status: 400 })
        }

        // Check for equipe conflict (soft warning)
        let conflictWarning: string | null = null
        const effectiveEquipeId = data.equipe_id !== undefined ? data.equipe_id : existing.equipe_id
        if (effectiveEquipeId) {
            const conflicts = await prisma.obraAgendaSegmento.findMany({
                where: {
                    id: { not: id },
                    equipe_id: effectiveEquipeId,
                    AND: [
                        { inicio: { lt: newFim } },
                        { fim: { gt: newInicio } },
                    ],
                },
                include: {
                    obra: { select: { titulo: true, id: true } },
                },
            })

            if (conflicts.length > 0) {
                const titles = conflicts.map((c) => c.obra.titulo || `Obra #${c.obra_id}`).join(", ")
                conflictWarning = `Conflito com: ${titles}`
            }
        }

        const updated = await prisma.obraAgendaSegmento.update({
            where: { id },
            data,
            include: {
                equipe: { select: { id: true, nome: true, cor: true } },
            },
        })

        return NextResponse.json({
            data: {
                id: updated.id,
                obra_id: updated.obra_id,
                equipe_id: updated.equipe_id,
                inicio: updated.inicio.toISOString().split("T")[0],
                fim: updated.fim.toISOString().split("T")[0],
                observacoes: updated.observacoes,
                equipe: updated.equipe,
            },
            warning: conflictWarning,
        })
    } catch (err) {
        console.error("Segmento PATCH error:", err)
        return NextResponse.json({ error: "Falha ao atualizar segmento" }, { status: 500 })
    }
}

/**
 * DELETE /api/segmentos/:id
 */
export async function DELETE(_req: Request, { params }: { params: Params }) {
    try {
        const perm = await checkEditPermission()
        if (!perm.allowed) return perm.error

        const { id: idStr } = await params
        const id = Number(idStr)
        if (!Number.isFinite(id)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 })
        }

        await prisma.obraAgendaSegmento.delete({ where: { id } })
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error("Segmento DELETE error:", err)
        return NextResponse.json({ error: "Falha ao excluir segmento" }, { status: 500 })
    }
}
