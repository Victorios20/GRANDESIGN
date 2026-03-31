import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { updateInitialBalance } from "@/actions/financeiro/banks/update-bank"
import { authOptions } from "@/lib/auth"

const updateInitialBalanceSchema = z.object({
    saldo_inicial: z.number().finite(),
})

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

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasBankManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const { id } = await context.params
        const bankId = Number(id)

        if (!Number.isInteger(bankId) || bankId <= 0) {
            return NextResponse.json({ error: "Conta bancária inválida" }, { status: 400 })
        }

        const body = await req.json()
        const input = updateInitialBalanceSchema.parse(body)
        const bank = await updateInitialBalance(bankId, input.saldo_inicial)

        return NextResponse.json(serializeBank(bank))
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }

        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
