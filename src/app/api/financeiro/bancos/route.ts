import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { getBanks, createBank } from "@/actions/financeiro/banks/read-create-bank"
import { updateBank } from "@/actions/financeiro/banks/update-bank"
import { ZodError } from "zod"

function getSessionRoles(session: unknown) {
    const roles = (session as { user?: { roles?: unknown[] } } | null)?.user?.roles ?? []
    return Array.isArray(roles) ? roles : []
}

function hasBankManagementAccess(session: unknown) {
    return getSessionRoles(session).some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

function serializeBank(bank: {
    id: number
    nome: string
    tipo: string
    banco: string | null
    agencia: string | null
    conta: string | null
    saldo_inicial: Prisma.Decimal | number | string
    saldo_atual: Prisma.Decimal | number | string
    cor: string | null
    ativo: boolean
    _count?: {
        lancamentos?: number
    }
}) {
    const transactionCount = bank._count?.lancamentos ?? 0

    return {
        id: bank.id,
        nome: bank.nome,
        tipo: bank.tipo,
        banco: bank.banco,
        agencia: bank.agencia,
        conta: bank.conta,
        saldo_inicial: Number(bank.saldo_inicial),
        saldo_atual: Number(bank.saldo_atual),
        cor: bank.cor,
        ativo: bank.ativo,
        transactionCount,
        hasTransactions: transactionCount > 0,
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const activeOnly = searchParams.get("active") !== "false"
        const banks = await getBanks(activeOnly)
        return NextResponse.json(banks.map(serializeBank))
    } catch {
        return NextResponse.json({ error: "Erro ao buscar bancos" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasBankManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const bank = await createBank(body)
        return NextResponse.json(serializeBank(bank), { status: 201 })
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
    if (!hasBankManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const bank = await updateBank(body)
        return NextResponse.json(serializeBank(bank))
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
