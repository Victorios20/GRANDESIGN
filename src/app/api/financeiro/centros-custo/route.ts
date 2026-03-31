import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ZodError } from "zod"

import {
    createCostCenter,
    getCostCenters,
    updateCostCenter,
} from "@/actions/financeiro/cost-centers"

function getSessionRoles(session: unknown) {
    const roles = (session as { user?: { roles?: unknown[] } } | null)?.user?.roles ?? []
    return Array.isArray(roles) ? roles : []
}

function hasCostCenterManagementAccess(session: unknown) {
    return getSessionRoles(session).some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

function serializeCostCenter(costCenter: {
    id: number
    nome: string
    descricao: string | null
    ativo: boolean
    obra_id: number | null
    obra: {
        id: number
        titulo: string | null
        endereco_obra: string | null
    } | null
    _count?: {
        lancamentos?: number
        contas_pagar?: number
        contas_receber?: number
    }
}) {
    const lancamentosCount = costCenter._count?.lancamentos ?? 0
    const contasPagarCount = costCenter._count?.contas_pagar ?? 0
    const contasReceberCount = costCenter._count?.contas_receber ?? 0

    return {
        id: costCenter.id,
        nome: costCenter.nome,
        descricao: costCenter.descricao,
        ativo: costCenter.ativo,
        obra_id: costCenter.obra_id,
        obra: costCenter.obra,
        lancamentosCount,
        contasPagarCount,
        contasReceberCount,
        usageCount: lancamentosCount + contasPagarCount + contasReceberCount,
        hasLinkedObra: Boolean(costCenter.obra_id),
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const activeOnly = searchParams.get("active") !== "false"
        const centros = await getCostCenters(activeOnly)
        return NextResponse.json(centros.map(serializeCostCenter))
    } catch {
        return NextResponse.json({ error: "Erro ao buscar centros de custo" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasCostCenterManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const costCenter = await createCostCenter(body)
        return NextResponse.json(serializeCostCenter(costCenter), { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }

        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasCostCenterManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const costCenter = await updateCostCenter(body)
        return NextResponse.json(serializeCostCenter(costCenter))
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }

        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
