import { prisma } from "@/lib/prisma"
import { Prisma, StatusConferencia, TipoLancamento } from "@prisma/client"

export interface GetTransactionsOptions {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
    dateType?: "lancamento" | "competencia"
    conta_bancaria_id?: number
    categoria_id?: number
    centro_custo_id?: number
    tipo?: TipoLancamento
    conciliado?: boolean
    orderBy?: "data_lancamento" | "data_competencia" | "created_at"
    orderDir?: "asc" | "desc"
}

export async function getTransactions(options: GetTransactionsOptions = {}) {
    const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        dateType = "lancamento", // default to cash view
        conta_bancaria_id,
        categoria_id,
        centro_custo_id,
        tipo,
        conciliado,
        orderBy = "data_lancamento",
        orderDir = "desc"
    } = options

    const skip = (page - 1) * limit

    // Build Where Clause
    const where: Prisma.LancamentoWhereInput = {}

    // Date Filter
    if (startDate || endDate) {
        const dateField = dateType === "competencia" ? "data_competencia" : "data_lancamento"
        where[dateField] = {}
        if (startDate) where[dateField]!.gte = startDate
        if (endDate) where[dateField]!.lte = endDate
    }

    // Exact Matches
    if (conta_bancaria_id) where.conta_bancaria_id = conta_bancaria_id
    if (categoria_id) where.categoria_id = categoria_id
    if (centro_custo_id) where.centro_custo_id = centro_custo_id
    if (tipo) where.tipo = tipo
    if (conciliado === true) where.status_conferencia = StatusConferencia.CONFERIDO
    if (conciliado === false) where.status_conferencia = { not: StatusConferencia.CONFERIDO }

    // Execute Query with Efficient Selects
    const [total, data] = await prisma.$transaction([
        prisma.lancamento.count({ where }),
        prisma.lancamento.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDir },
            include: {
                conta_bancaria: {
                    select: { id: true, nome: true, banco: true, cor: true }
                },
                categoria: {
                    select: { id: true, nome: true, cor: true, icone: true, tipo: true }
                },
                centro_custo: {
                    select: { id: true, nome: true }
                },
                // Origins
                conta_pagar: {
                    select: { id: true, descricao: true, fornecedor: { select: { nome: true } } }
                },
                conta_receber: {
                    select: { id: true, descricao: true, cliente: { select: { nome: true } } }
                },
                transferencia: {
                    select: { id: true }
                },
                createdBy: {
                    select: { id: true, name: true }
                }
            }
        })
    ])

    return {
        data: data.map((item) => ({
            ...item,
            conciliado: item.status_conferencia === StatusConferencia.CONFERIDO,
        })),
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }
}
