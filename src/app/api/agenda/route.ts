// src/app/api/agenda/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { type ObraStatus } from "@prisma/client"
import { fromDateOnlyDb, getTodayDateOnly, parseDateOnlyInput } from "@/lib/date-only"

export const dynamic = "force-dynamic"

/**
 * GET /api/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD&equipe_id=&status=&bairro=&tipo_obra=
 * Returns segments in date range with obra summary + KPIs
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const fromStr = url.searchParams.get("from")
        const toStr = url.searchParams.get("to")
        const equipeId = url.searchParams.get("equipe_id")
        const status = url.searchParams.get("status")
        const bairro = url.searchParams.get("bairro")
        const tipoObra = url.searchParams.get("tipo_obra")
        const fromDate = parseDateOnlyInput(fromStr)
        const toDate = parseDateOnlyInput(toStr)

        // Build segment filters
        const segmentWhere: any = {}

        if (fromDate && toDate) {
            // Segments that overlap with the date range
            // Stored dates are inclusive; calendar range end is exclusive.
            segmentWhere.AND = [
                { inicio: { lt: toDate } },
                { fim: { gte: fromDate } },
            ]
        } else if (fromDate) {
            segmentWhere.fim = { gte: fromDate }
        } else if (toDate) {
            segmentWhere.inicio = { lt: toDate }
        }

        if (equipeId) {
            segmentWhere.equipe_id = Number(equipeId)
        }

        // Obra-level filters need to be applied via relation
        const obraWhere: any = {}
        if (status) {
            obraWhere.status = status as ObraStatus
        }
        if (tipoObra) {
            obraWhere.tipo_obra = { contains: tipoObra, mode: "insensitive" }
        }
        if (bairro) {
            obraWhere.cliente = { bairro: { contains: bairro, mode: "insensitive" } }
        }

        if (Object.keys(obraWhere).length > 0) {
            segmentWhere.obra = obraWhere
        }

        // Fetch segments with obra and equipe data
        const segmentos = await prisma.obraAgendaSegmento.findMany({
            where: segmentWhere,
            include: {
                obra: {
                    select: {
                        id: true,
                        titulo: true,
                        status: true,
                        tipo_obra: true,
                        data_ultima_alteracao: true,
                        cliente: {
                            select: {
                                id: true,
                                nome: true,
                                bairro: true,
                                cidades: {
                                    select: {
                                        nome: true,
                                    },
                                },
                            },
                        },
                    },
                },
                equipe: {
                    select: {
                        id: true,
                        nome: true,
                        cor: true,
                    },
                },
            },
            orderBy: { inicio: "asc" },
        })

        // Fetch all cities with colors using raw SQL to bypass stale Prisma client
        const { getCidadesDB } = await import("@/actions/cidades-db/cidades-db")
        const cidades = await getCidadesDB()
        const cidadeCorMap = new Map(cidades.map(c => [c.nome, c.cor || null]))

        // Transform to frontend format
        const segmentosFormatted = (segmentos as any[]).map((s) => {
            const cidadeNome = s.obra.cliente?.cidades?.nome || null
            const cidadeCor = cidadeNome ? cidadeCorMap.get(cidadeNome) : null

            return {
                id: s.id,
                inicio: fromDateOnlyDb(s.inicio)!,
                fim: fromDateOnlyDb(s.fim)!,
                observacoes: s.observacoes,
                tipo: s.tipo,
                status: s.status,
                obra: {
                    id: s.obra.id,
                    titulo: s.obra.titulo,
                    status: s.obra.status,
                    tipoObra: s.obra.tipo_obra,
                    cliente: s.obra.cliente?.nome || null,
                    clienteBairro: s.obra.cliente?.bairro || null,
                    clienteCidade: cidadeNome,
                    clienteCidadeCor: cidadeCor || null,
                    dataUltimaAlteracao: s.obra.data_ultima_alteracao ? s.obra.data_ultima_alteracao.toISOString() : null,
                },
                equipe: s.equipe
                    ? {
                        id: s.equipe.id,
                        nome: s.equipe.nome,
                        cor: s.equipe.cor,
                    }
                    : null,
            }
        })

        // Calculate KPIs
        const today = parseDateOnlyInput(getTodayDateOnly())

        // Obras faltando agendar (0 segmentos and status != FINALIZADO)
        const faltandoAgendar = await prisma.obras.count({
            where: {
                status: { not: "FINALIZADO" },
                segmentos: { none: {} },
            },
        })

        // Obras agendadas (>= 1 segmento)
        const agendadas = await prisma.obras.count({
            where: {
                segmentos: { some: {} },
            },
        })

        // Obras em atraso (hoje > fim do último segmento AND status != FINALIZADO)
        // This requires a raw query or subquery approach
        const obrasComSegmentos = await prisma.obras.findMany({
            where: {
                status: { not: "FINALIZADO" },
                segmentos: { some: {} },
            },
            select: {
                id: true,
                segmentos: {
                    select: { fim: true },
                    orderBy: { fim: "desc" },
                    take: 1,
                },
            },
        })

        const emAtraso = obrasComSegmentos.filter((obra) => {
            const lastFim = obra.segmentos[0]?.fim
            if (!lastFim || !today) return false
            return lastFim < today
        }).length

        return NextResponse.json({
            segmentos: segmentosFormatted,
            kpis: {
                faltandoAgendar,
                agendadas,
                emAtraso,
            },
        })
    } catch (err) {
        console.error("Agenda GET error:", err)
        return NextResponse.json({ error: "Falha ao buscar agenda" }, { status: 500 })
    }
}
