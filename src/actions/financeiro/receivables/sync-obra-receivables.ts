import { addDays } from "date-fns"
import { Prisma, StatusFinanceiro, TipoCategoria } from "@prisma/client"

type Tx = Prisma.TransactionClient
type ObraReceivableOrigin = "ENTRADA" | "QUITACAO"
const ESTIMATED_OBRA_EXECUTION_DAYS = 10

type ReceivablePlanItem = {
    origem: ObraReceivableOrigin
    parcela: number
    totalParcelas: number
    valor: number
    vencimento: Date
    forma: string | null
    observacoes?: string | null
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    const numberValue = Number(value ?? 0)
    return Number.isFinite(numberValue) ? numberValue : 0
}

function startOfDate(value: Date) {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
}

export function parseInstallmentCount(forma: string | null | undefined) {
    const normalized = String(forma ?? "").trim().toLowerCase()
    if (!normalized || normalized === "pix") return 1

    const match = normalized.match(/^(\d{1,2})x$/)
    if (!match) return 1

    const count = Number(match[1])
    return Number.isFinite(count) && count > 0 ? count : 1
}

export function buildObraReceivableObservation(forma: string | null | undefined) {
    const totalParcelas = parseInstallmentCount(forma)
    if (totalParcelas <= 1) return null

    return `Pagamento de quitação em ${totalParcelas}x. Conta consolidada automaticamente pela obra.`
}

export async function getReceivableCategoryId(tx: Tx) {
    let parent = await tx.categoria.findFirst({
        where: { nome: "Receita", categoria_pai_id: null },
        select: { id: true },
    })

    if (parent) {
        parent = await tx.categoria.update({
            where: { id: parent.id },
            data: { tipo: TipoCategoria.RECEITA, ativo: true },
            select: { id: true },
        })
    } else {
        parent = await tx.categoria.create({
            data: { nome: "Receita", tipo: TipoCategoria.RECEITA, ativo: true },
            select: { id: true },
        })
    }

    const existingChild = await tx.categoria.findFirst({
        where: { nome: "Pagamento de Cliente", categoria_pai_id: parent.id },
        select: { id: true },
    })
    if (existingChild) return existingChild.id

    return (await tx.categoria.create({
        data: {
            nome: "Pagamento de Cliente",
            tipo: TipoCategoria.RECEITA,
            categoria_pai_id: parent.id,
            ativo: true,
        },
        select: { id: true },
    })).id
}

export function buildPlan(obra: {
    pagamento_entrada: Prisma.Decimal | null
    forma_pagamento_entrada: string | null
    pagamento_quitacao: Prisma.Decimal | null
    forma_pagamento_quitacao: string | null
    data_contrato: Date | null
    data_criacao: Date | null
}) {
    const baseDate = startOfDate(obra.data_contrato ?? obra.data_criacao ?? new Date())
    const plan: ReceivablePlanItem[] = []

    const entrada = toNumber(obra.pagamento_entrada)
    if (entrada > 0) {
        plan.push({
            origem: "ENTRADA",
            parcela: 1,
            totalParcelas: 1,
            valor: entrada,
            vencimento: baseDate,
            forma: obra.forma_pagamento_entrada,
        })
    }

    const quitacao = toNumber(obra.pagamento_quitacao)
    if (quitacao > 0) {
        plan.push({
            origem: "QUITACAO",
            parcela: 1,
            totalParcelas: 1,
            valor: quitacao,
            vencimento: startOfDate(addDays(baseDate, ESTIMATED_OBRA_EXECUTION_DAYS)),
            forma: obra.forma_pagamento_quitacao,
            observacoes: buildObraReceivableObservation(obra.forma_pagamento_quitacao),
        })
    }

    return plan
}

function planKey(item: Pick<ReceivablePlanItem, "origem" | "parcela" | "totalParcelas">) {
    return `${item.origem}:${item.parcela}:${item.totalParcelas}`
}

export async function syncObraReceivables(tx: Tx, obraId: number, userId?: number) {
    const obra = await tx.obras.findUnique({
        where: { id: obraId },
        select: {
            id: true,
            titulo: true,
            cliente_id: true,
            orcamento_id: true,
            pagamento_entrada: true,
            forma_pagamento_entrada: true,
            pagamento_quitacao: true,
            forma_pagamento_quitacao: true,
            data_contrato: true,
            data_criacao: true,
            centro_custo: {
                where: { ativo: true },
                orderBy: { id: "asc" },
                select: { id: true },
            },
        },
    })

    if (!obra) throw new Error("Obra nao encontrada")

    const centroCustoId = obra.centro_custo[0]?.id ?? null
    const categoriaId = await getReceivableCategoryId(tx)
    const plan = buildPlan(obra)
    const plannedKeys = new Set(plan.map(planKey))
    const editableStatuses: StatusFinanceiro[] = [StatusFinanceiro.PENDENTE, StatusFinanceiro.ATRASADO]
    const createdIds: number[] = []

    const existing = await tx.contaReceber.findMany({
        where: {
            obra_id: obraId,
            auto_gerado: true,
        },
        select: {
            id: true,
            origem_obra_tipo: true,
            parcela_atual: true,
            total_parcelas: true,
            status: true,
            valor_recebido: true,
        },
    })

    for (const item of plan) {
        const current = existing.find((row) =>
            row.origem_obra_tipo === item.origem &&
            row.parcela_atual === item.parcela &&
            row.total_parcelas === item.totalParcelas
        )

        const descricaoBase = item.origem === "ENTRADA" ? "Entrada" : "Quitação"
        const descricao = `${descricaoBase} - ${obra.titulo || `Obra #${obra.id}`} (${item.parcela}/${item.totalParcelas})`

        if (current) {
            if (!editableStatuses.includes(current.status) || toNumber(current.valor_recebido) > 0) continue

            await tx.contaReceber.update({
                where: { id: current.id },
                data: {
                    descricao,
                    valor_total: item.valor,
                    data_vencimento: item.vencimento,
                    cliente_id: obra.cliente_id,
                    orcamento_id: obra.orcamento_id,
                    categoria_id: categoriaId,
                    centro_custo_id: centroCustoId,
                    forma_pagamento_origem: item.forma,
                    observacoes: item.observacoes ?? null,
                    updated_by: userId,
                },
            })
            continue
        }

        const created = await tx.contaReceber.create({
            data: {
                descricao,
                valor_total: item.valor,
                valor_recebido: 0,
                data_emissao: startOfDate(new Date()),
                data_vencimento: item.vencimento,
                status: StatusFinanceiro.PENDENTE,
                cliente_id: obra.cliente_id,
                orcamento_id: obra.orcamento_id,
                obra_id: obra.id,
                origem_obra_tipo: item.origem,
                auto_gerado: true,
                forma_pagamento_origem: item.forma,
                observacoes: item.observacoes ?? null,
                categoria_id: categoriaId,
                centro_custo_id: centroCustoId,
                parcela_atual: item.parcela,
                total_parcelas: item.totalParcelas,
                created_by: userId,
                updated_by: userId,
            },
            select: { id: true },
        })
        createdIds.push(created.id)
    }

    const staleIds = existing
        .filter((row) => !plannedKeys.has(planKey({
            origem: row.origem_obra_tipo as ObraReceivableOrigin,
            parcela: row.parcela_atual,
            totalParcelas: row.total_parcelas,
        })))
        .filter((row) => editableStatuses.includes(row.status) && toNumber(row.valor_recebido) === 0)
        .map((row) => row.id)

    if (staleIds.length > 0) {
        await tx.contaReceber.updateMany({
            where: { id: { in: staleIds } },
            data: {
                status: StatusFinanceiro.CANCELADO,
                updated_by: userId,
            },
        })
    }

    // Ids das contas a receber recém-criadas (para notificar após o commit).
    return createdIds
}
