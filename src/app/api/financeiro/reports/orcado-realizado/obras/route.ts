import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_LIMIT = 15
const MAX_LIMIT = 50

function parseLimit(value: string | null) {
    const limit = Number(value ?? DEFAULT_LIMIT)
    if (!Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT
    return Math.min(Math.floor(limit), MAX_LIMIT)
}

function buildSearchWhere(search: string): Prisma.obrasWhereInput {
    const id = /^\d+$/.test(search) ? Number(search) : null
    const filters: Prisma.obrasWhereInput[] = [
        { titulo: { contains: search, mode: "insensitive" } },
        { cliente: { nome: { contains: search, mode: "insensitive" } } },
    ]

    if (id != null && Number.isFinite(id)) {
        filters.unshift({ id })
    }

    return { OR: filters }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const search = String(searchParams.get("search") ?? "").trim()
        const limit = parseLimit(searchParams.get("limit"))

        const obras = await prisma.obras.findMany({
            where: search ? buildSearchWhere(search) : undefined,
            select: {
                id: true,
                titulo: true,
                cliente: {
                    select: { nome: true },
                },
            },
            orderBy: [
                { data_ultima_alteracao: "desc" },
                { id: "desc" },
            ],
            take: limit,
        })

        const data = obras.map((obra) => ({
            id: obra.id,
            titulo: obra.titulo || `Obra #${obra.id} - ${obra.cliente?.nome || "Sem cliente"}`,
        }))

        return NextResponse.json({ data })
    } catch (error) {
        console.error("[GET /api/financeiro/reports/orcado-realizado/obras]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
