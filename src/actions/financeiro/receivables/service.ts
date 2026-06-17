import { FrequenciaRecorrencia, Prisma, StatusFinanceiro } from "@prisma/client"
import { z } from "zod"

import { zDateOnly } from "@/lib/date-only"
import { calculateInstallments } from "@/lib/financial/installments"
import { isReceivableCategory } from "@/lib/financial/fixed-category-taxonomy"
import { prisma } from "@/lib/prisma"
import { notifyContaCriada } from "@/lib/email/notifications"

export const createReceivableSchema = z.object({
    descricao: z.string().min(1).max(200),
    valor: z.number().positive(),
    data_emissao: zDateOnly,
    data_vencimento: zDateOnly,
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
    data_emissao: zDateOnly,
    primeiro_vencimento: zDateOnly,
    cliente_id: z.number().int().positive().optional().nullable(),
    categoria_id: z.number().int().positive(),
    centro_custo_id: z.number().int().positive().optional().nullable(),
    observacoes: z.string().optional(),
    orcamento_id: z.number().int().positive().optional().nullable(),
})

export type CreateReceivableInput = z.infer<typeof createReceivableSchema>
export type CreateReceivableInstallmentInput = z.infer<
    typeof createReceivableInstallmentSchema
>

async function validateCategory(id: number) {
    const category = await prisma.categoria.findUnique({
        where: { id },
        include: {
            categoria_pai: {
                select: {
                    nome: true,
                },
            },
        },
    })

    if (!category) throw new Error("Categoria nao encontrada")
    if (!category.ativo) throw new Error("Categoria inativa")
    if (!isReceivableCategory(category)) {
        throw new Error("Categoria deve ser operacional de receita")
    }
}

export async function createReceivable(input: CreateReceivableInput, userId?: number) {
    await validateCategory(input.categoria_id)

    const conta = await prisma.contaReceber.create({
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
            created_by: userId,
        },
    })

    await notifyContaCriada({
        tipo: "RECEBER",
        descricao: conta.descricao,
        valor: Number(conta.valor_total),
        vencimento: conta.data_vencimento,
    })

    return conta
}

export async function createReceivableInstallments(
    input: CreateReceivableInstallmentInput,
    userId?: number,
) {
    await validateCategory(input.categoria_id)

    const installments = calculateInstallments(
        input.valor_total,
        input.total_parcelas,
        input.primeiro_vencimento,
    )

    const contas = await prisma.$transaction(
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
                    created_by: userId,
                },
            }),
        ),
    )

    await notifyContaCriada({
        tipo: "RECEBER",
        descricao: `${input.descricao} (${input.total_parcelas}x)`,
        valor: input.valor_total,
        vencimento: input.primeiro_vencimento,
    })

    return contas
}

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
    orderBy?: ReceivableOrderBy
    orderDir?: "asc" | "desc"
}

export type ReceivableOrderBy =
    | "data_vencimento"
    | "cliente"
    | "descricao"
    | "categoria"
    | "valor_total"
    | "status"
    | "created_at"

const FINANCIAL_STATUSES: StatusFinanceiro[] = [
    StatusFinanceiro.PENDENTE,
    StatusFinanceiro.PARCIAL,
    StatusFinanceiro.ATRASADO,
    StatusFinanceiro.PAGO,
    StatusFinanceiro.CANCELADO,
]

function buildDueDateFilter(startDate?: Date, endDate?: Date) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = startDate
    if (endDate) dateFilter.lte = endDate
    return dateFilter
}

function isOnlyOverdueStatus(status?: StatusFinanceiro | StatusFinanceiro[]) {
    return (
        status === StatusFinanceiro.ATRASADO ||
        (Array.isArray(status) &&
            status.length === 1 &&
            status[0] === StatusFinanceiro.ATRASADO)
    )
}

function buildReceivablesWhere(
    filters: Omit<GetReceivablesOptions, "page" | "limit" | "orderBy" | "orderDir">,
    options: { includeStatus?: boolean; includeDate?: boolean } = {},
) {
    const { startDate, endDate, status, cliente_id, categoria_id, centro_custo_id, search } =
        filters
    const { includeStatus = true, includeDate = true } = options
    const where: Prisma.ContaReceberWhereInput = {}

    if (includeDate && (startDate || endDate)) {
        where.data_vencimento = buildDueDateFilter(startDate, endDate)
    }

    if (includeStatus && status) {
        where.status = Array.isArray(status) ? { in: status } : status
    }
    if (cliente_id) where.cliente_id = cliente_id
    if (categoria_id) where.categoria_id = categoria_id
    if (centro_custo_id) where.centro_custo_id = centro_custo_id
    if (search) where.descricao = { contains: search, mode: "insensitive" }

    return where
}

function buildReceivablesOrderBy(
    orderBy: ReceivableOrderBy = "data_vencimento",
    orderDir: "asc" | "desc" = "desc",
) {
    const direction = orderDir === "asc" ? "asc" : "desc"
    const fallback: Prisma.ContaReceberOrderByWithRelationInput = { id: direction }

    const primary: Prisma.ContaReceberOrderByWithRelationInput =
        orderBy === "cliente"
            ? { cliente: { nome: direction } }
            : orderBy === "categoria"
              ? { categoria: { nome: direction } }
              : orderBy === "descricao"
                ? { descricao: direction }
                : orderBy === "valor_total"
                  ? { valor_total: direction }
                  : orderBy === "status"
                    ? { status: direction }
                    : orderBy === "created_at"
                      ? { created_at: direction }
                      : { data_vencimento: direction }

    return [primary, fallback]
}

function sumOpenAmount(total: Prisma.Decimal | null | undefined, received: Prisma.Decimal | null | undefined) {
    return Number(total ?? 0) - Number(received ?? 0)
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
        orderBy = "data_vencimento",
        orderDir = "desc",
    } = options
    const skip = (page - 1) * limit

    const where = buildReceivablesWhere(
        { startDate, endDate, status, cliente_id, categoria_id, centro_custo_id, search },
        { includeDate: !isOnlyOverdueStatus(status) },
    )

    const [total, data] = await prisma.$transaction([
        prisma.contaReceber.count({ where }),
        prisma.contaReceber.findMany({
            where,
            skip,
            take: limit,
            orderBy: buildReceivablesOrderBy(orderBy, orderDir),
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

export async function getReceivablesSummary(
    filters: Omit<GetReceivablesOptions, "page" | "limit"> = {},
) {
    const { startDate, endDate, status, cliente_id, categoria_id, centro_custo_id, search } =
        filters
    const filterWhere = buildReceivablesWhere(
        { startDate, endDate, status, cliente_id, categoria_id, centro_custo_id, search },
        { includeDate: !isOnlyOverdueStatus(status) },
    )
    const countBaseWhere = buildReceivablesWhere(
        { startDate, endDate, cliente_id, categoria_id, centro_custo_id, search },
        { includeStatus: false },
    )
    const countNoDateWhere = buildReceivablesWhere(
        { cliente_id, categoria_id, centro_custo_id, search },
        { includeStatus: false, includeDate: false },
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)

    const baseWhere = {
        ...countBaseWhere,
        status: {
            notIn: [StatusFinanceiro.PAGO, StatusFinanceiro.CANCELADO] as StatusFinanceiro[],
        },
    }

    const statusCountQueries = FINANCIAL_STATUSES.map((itemStatus) =>
        prisma.contaReceber.count({
            where: {
                ...(itemStatus === StatusFinanceiro.ATRASADO
                    ? countNoDateWhere
                    : countBaseWhere),
                status: itemStatus,
            },
        }),
    )

    const [
        filterAggregate,
        filterCount,
        totalByDate,
        totalPending,
        overdue,
        dueToday,
        dueNext7,
        ...statusCountValues
    ] = await prisma.$transaction([
        prisma.contaReceber.aggregate({
            where: filterWhere,
            _sum: { valor_total: true, valor_recebido: true },
        }),
        prisma.contaReceber.count({ where: filterWhere }),
        prisma.contaReceber.count({ where: countBaseWhere }),
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
        ...statusCountQueries,
    ])

    const statusCounts = FINANCIAL_STATUSES.reduce(
        (acc, itemStatus, index) => ({
            ...acc,
            [itemStatus]: Number(statusCountValues[index] ?? 0),
        }),
        { todos: totalByDate } as Record<"todos" | StatusFinanceiro, number>,
    )

    return {
        filterCount,
        filterOpenAmount: sumOpenAmount(
            filterAggregate._sum.valor_total,
            filterAggregate._sum.valor_recebido,
        ),
        statusCounts,
        totalAmount: sumOpenAmount(
            totalPending._sum.valor_total,
            totalPending._sum.valor_recebido,
        ),
        totalPending: totalPending._count,
        overdueAmount: sumOpenAmount(overdue._sum.valor_total, overdue._sum.valor_recebido),
        overdueCount: overdue._count,
        dueTodayAmount: sumOpenAmount(
            dueToday._sum.valor_total,
            dueToday._sum.valor_recebido,
        ),
        dueTodayCount: dueToday._count,
        dueNext7Amount: sumOpenAmount(
            dueNext7._sum.valor_total,
            dueNext7._sum.valor_recebido,
        ),
        dueNext7Count: dueNext7._count,
    }
}
