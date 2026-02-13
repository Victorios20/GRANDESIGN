import { prisma } from "@/lib/prisma"
import { StatusFinanceiro, FrequenciaRecorrencia, TipoCategoria, Prisma } from "@prisma/client"
import { calculateInstallments } from "@/lib/financial/installments"
import { z } from "zod"

// --- Schemas ---

export const createReceivableSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor: z.number().positive(),
    data_emissao: z.coerce.date(),
    data_vencimento: z.coerce.date(),
    cliente_id: z.number().int().positive().optional().nullable(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().optional().nullable(),
    observacoes: z.string().optional(),
    orcamento_id: z.number().int().positive().optional().nullable(),
    recorrente: z.boolean().optional(),
    frequencia: z.nativeEnum(FrequenciaRecorrencia).optional().nullable(),
})

export const createReceivableInstallmentSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor_total: z.number().positive(),
    total_parcelas: z.number().int().min(2).max(36),
    data_emissao: z.coerce.date(),
    primeiro_vencimento: z.coerce.date(),
    cliente_id: z.number().int().positive().optional().nullable(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().optional().nullable(),
    observacoes: z.string().optional(),
    orcamento_id: z.number().int().positive().optional().nullable(),
})

export type CreateReceivableInput = z.infer<typeof createReceivableSchema>
export type CreateReceivableInstallmentInput = z.infer<typeof createReceivableInstallmentSchema>

// --- Services ---

async function validateCategory(id: number) {
    const category = await prisma.categoria.findUnique({ where: { id } })
    if (!category) throw new Error("Categoria não encontrada")
    if (!category.ativo) throw new Error("Categoria inativa")
    if (category.tipo !== TipoCategoria.RECEITA) throw new Error("Categoria deve ser de Receita")
}

export async function createReceivable(input: CreateReceivableInput, userId?: number) {
    await validateCategory(input.categoria_id)

    return await prisma.contaReceber.create({
        data: {
            descricao: input.descricao,
            valor_total: input.valor,
            data_emissao: input.data_emissao,
            data_vencimento: input.data_vencimento,
            cliente_id: input.cliente_id,
            categoria_id: input.categoria_id,
            centro_custo_id: input.centro_custo_id,
            observacoes: input.observacoes,
            orcamento_id: input.orcamento_id,
            recorrente: input.recorrente,
            frequencia: input.frequencia,
            valor_recebido: 0,
            status: StatusFinanceiro.PENDENTE,
            parcela_atual: 1,
            total_parcelas: 1,
            created_by: userId
        }
    })
}

export async function createReceivableInstallments(input: CreateReceivableInstallmentInput, userId?: number) {
    await validateCategory(input.categoria_id)

    const installments = calculateInstallments(
        input.valor_total,
        input.total_parcelas,
        input.primeiro_vencimento
    )

    return await prisma.$transaction(
        installments.map((inst) =>
            prisma.contaReceber.create({
                data: {
                    descricao: `${input.descricao} (${inst.parcela}/${input.total_parcelas})`,
                    valor_total: inst.valor,
                    valor_recebido: 0,
                    data_emissao: input.data_emissao,
                    data_vencimento: inst.data_vencimento,
                    status: StatusFinanceiro.PENDENTE,
                    cliente_id: input.cliente_id,
                    categoria_id: input.categoria_id,
                    centro_custo_id: input.centro_custo_id,
                    observacoes: input.observacoes,
                    orcamento_id: input.orcamento_id,
                    parcela_atual: inst.parcela,
                    total_parcelas: input.total_parcelas,
                    created_by: userId
                }
            })
        )
    )
}

// --- List Service ---

export interface GetReceivablesOptions {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
    status?: StatusFinanceiro | StatusFinanceiro[]
    cliente_id?: number
    categoria_id?: number
    centro_custo_id?: number
    search?: string
}

export async function getReceivables(options: GetReceivablesOptions = {}) {
    const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        status,
        cliente_id,
        categoria_id,
        centro_custo_id,
        search,
    } = options
    const skip = (page - 1) * limit

    const where: Prisma.ContaReceberWhereInput = {}

    if (startDate || endDate) {
        where.data_vencimento = {}
        if (startDate) (where.data_vencimento as any).gte = startDate
        if (endDate) (where.data_vencimento as any).lte = endDate
    }

    if (status) {
        where.status = Array.isArray(status) ? { in: status } : status
    }
    if (cliente_id) where.cliente_id = cliente_id
    if (categoria_id) where.categoria_id = categoria_id
    if (centro_custo_id) where.centro_custo_id = centro_custo_id
    if (search) {
        where.descricao = { contains: search, mode: "insensitive" }
    }

    const [total, data] = await prisma.$transaction([
        prisma.contaReceber.count({ where }),
        prisma.contaReceber.findMany({
            where,
            skip,
            take: limit,
            orderBy: { data_vencimento: "asc" },
            include: {
                cliente: { select: { id: true, nome: true } },
                categoria: { select: { id: true, nome: true, cor: true } },
                centro_custo: { select: { id: true, nome: true } },
            },
        }),
    ])

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    }
}

export async function getReceivablesSummary(filters: Omit<GetReceivablesOptions, "page" | "limit"> = {}) {
    const { startDate, endDate, status, cliente_id, categoria_id, centro_custo_id, search } = filters
    const where: Prisma.ContaReceberWhereInput = {}

    if (startDate || endDate) {
        where.data_vencimento = {}
        if (startDate) (where.data_vencimento as any).gte = startDate
        if (endDate) (where.data_vencimento as any).lte = endDate
    }
    if (status) where.status = Array.isArray(status) ? { in: status } : status
    if (cliente_id) where.cliente_id = cliente_id
    if (categoria_id) where.categoria_id = categoria_id
    if (centro_custo_id) where.centro_custo_id = centro_custo_id
    if (search) where.descricao = { contains: search, mode: "insensitive" }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)

    const baseWhere = { ...where, status: { notIn: [StatusFinanceiro.PAGO, StatusFinanceiro.CANCELADO] as StatusFinanceiro[] } }

    const [totalPending, overdue, dueToday, dueNext7] = await prisma.$transaction([
        prisma.contaReceber.aggregate({
            where: baseWhere,
            _sum: { valor_total: true, valor_recebido: true },
            _count: true,
        }),
        prisma.contaReceber.aggregate({
            where: { ...baseWhere, data_vencimento: { lt: today } },
            _sum: { valor_total: true, valor_recebido: true },
            _count: true,
        }),
        prisma.contaReceber.aggregate({
            where: { ...baseWhere, data_vencimento: { gte: today, lt: tomorrow } },
            _sum: { valor_total: true, valor_recebido: true },
            _count: true,
        }),
        prisma.contaReceber.aggregate({
            where: { ...baseWhere, data_vencimento: { gte: today, lt: next7 } },
            _sum: { valor_total: true, valor_recebido: true },
            _count: true,
        }),
    ])

    return {
        totalAmount: Number(totalPending._sum.valor_total ?? 0) - Number(totalPending._sum.valor_recebido ?? 0),
        totalPending: totalPending._count,
        overdueAmount: Number(overdue._sum.valor_total ?? 0) - Number(overdue._sum.valor_recebido ?? 0),
        overdueCount: overdue._count,
        dueTodayAmount: Number(dueToday._sum.valor_total ?? 0) - Number(dueToday._sum.valor_recebido ?? 0),
        dueTodayCount: dueToday._count,
        dueNext7Amount: Number(dueNext7._sum.valor_total ?? 0) - Number(dueNext7._sum.valor_recebido ?? 0),
        dueNext7Count: dueNext7._count,
    }
}

