import { Prisma, StatusFinanceiro, TipoCategoria } from "@prisma/client"

type Tx = Prisma.TransactionClient
type ObraPayableOrigin = "MAO_DE_OBRA"

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    const numberValue = Number(value ?? 0)
    return Number.isFinite(numberValue) ? numberValue : 0
}

function startOfDate(value: Date) {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
}

type PayablePlanItem = {
    origem: ObraPayableOrigin
    parcela: number
    totalParcelas: number
    valor: number
    vencimento: Date
}

/**
 * Resolve (ou cria) a categoria "Mão de Obra" filha de "Custos diretos" (DESPESA).
 * Espelha getReceivableCategoryId, mas para o lado de despesa.
 */
export async function getMaoDeObraCategoryId(tx: Tx) {
    let parent = await tx.categoria.findFirst({
        where: { nome: "Custos diretos", categoria_pai_id: null },
        select: { id: true },
    })

    if (parent) {
        parent = await tx.categoria.update({
            where: { id: parent.id },
            data: { tipo: TipoCategoria.DESPESA, ativo: true },
            select: { id: true },
        })
    } else {
        parent = await tx.categoria.create({
            data: { nome: "Custos diretos", tipo: TipoCategoria.DESPESA, ativo: true },
            select: { id: true },
        })
    }

    const existingChild = await tx.categoria.findFirst({
        where: { nome: "Mão de Obra", categoria_pai_id: parent.id },
        select: { id: true },
    })
    if (existingChild) return existingChild.id

    return (await tx.categoria.create({
        data: {
            nome: "Mão de Obra",
            tipo: TipoCategoria.DESPESA,
            categoria_pai_id: parent.id,
            ativo: true,
        },
        select: { id: true },
    })).id
}

function buildPlan(obra: {
    valor_mao_de_obra: Prisma.Decimal | null
    data_contrato: Date | null
    data_criacao: Date | null
}) {
    const baseDate = startOfDate(obra.data_contrato ?? obra.data_criacao ?? new Date())
    const plan: PayablePlanItem[] = []

    const maoDeObra = toNumber(obra.valor_mao_de_obra)
    if (maoDeObra > 0) {
        plan.push({
            origem: "MAO_DE_OBRA",
            parcela: 1,
            totalParcelas: 1,
            valor: maoDeObra,
            vencimento: baseDate,
        })
    }

    return plan
}

function planKey(item: Pick<PayablePlanItem, "origem" | "parcela" | "totalParcelas">) {
    return `${item.origem}:${item.parcela}:${item.totalParcelas}`
}

/**
 * Gera/atualiza as contas a pagar automáticas da obra (mão de obra).
 * A conta a pagar é vinculada ao fornecedor da equipe da obra (quando houver).
 */
export async function syncObraPayables(tx: Tx, obraId: number, userId?: number) {
    const obra = await tx.obras.findUnique({
        where: { id: obraId },
        select: {
            id: true,
            titulo: true,
            valor_mao_de_obra: true,
            data_contrato: true,
            data_criacao: true,
            equipe: { select: { nome: true, fornecedor_id: true } },
            centro_custo: {
                where: { ativo: true },
                orderBy: { id: "asc" },
                select: { id: true },
            },
        },
    })

    if (!obra) throw new Error("Obra nao encontrada")

    const centroCustoId = obra.centro_custo[0]?.id ?? null
    const fornecedorId = obra.equipe?.fornecedor_id ?? null
    const equipeNome = obra.equipe?.nome ?? null
    const categoriaId = await getMaoDeObraCategoryId(tx)
    const plan = buildPlan(obra)
    const plannedKeys = new Set(plan.map(planKey))
    const editableStatuses: StatusFinanceiro[] = [StatusFinanceiro.PENDENTE, StatusFinanceiro.ATRASADO]

    const existing = await tx.contaPagar.findMany({
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
            valor_pago: true,
        },
    })

    for (const item of plan) {
        const current = existing.find((row) =>
            row.origem_obra_tipo === item.origem &&
            row.parcela_atual === item.parcela &&
            row.total_parcelas === item.totalParcelas
        )

        const tituloObra = obra.titulo || `Obra #${obra.id}`
        const descricao = equipeNome
            ? `Mão de obra - ${tituloObra} (equipe ${equipeNome})`
            : `Mão de obra - ${tituloObra}`

        if (current) {
            if (!editableStatuses.includes(current.status) || toNumber(current.valor_pago) > 0) continue

            await tx.contaPagar.update({
                where: { id: current.id },
                data: {
                    descricao,
                    valor_total: item.valor,
                    data_vencimento: item.vencimento,
                    fornecedor_id: fornecedorId,
                    categoria_id: categoriaId,
                    centro_custo_id: centroCustoId,
                    updated_by: userId,
                },
            })
            continue
        }

        await tx.contaPagar.create({
            data: {
                descricao,
                valor_total: item.valor,
                valor_pago: 0,
                data_emissao: startOfDate(new Date()),
                data_vencimento: item.vencimento,
                status: StatusFinanceiro.PENDENTE,
                fornecedor_id: fornecedorId,
                obra_id: obra.id,
                origem_obra_tipo: item.origem,
                auto_gerado: true,
                categoria_id: categoriaId,
                centro_custo_id: centroCustoId,
                parcela_atual: item.parcela,
                total_parcelas: item.totalParcelas,
                created_by: userId,
                updated_by: userId,
            },
        })
    }

    const staleIds = existing
        .filter((row) => !plannedKeys.has(planKey({
            origem: row.origem_obra_tipo as ObraPayableOrigin,
            parcela: row.parcela_atual,
            totalParcelas: row.total_parcelas,
        })))
        .filter((row) => editableStatuses.includes(row.status) && toNumber(row.valor_pago) === 0)
        .map((row) => row.id)

    if (staleIds.length > 0) {
        await tx.contaPagar.updateMany({
            where: { id: { in: staleIds } },
            data: {
                status: StatusFinanceiro.CANCELADO,
                updated_by: userId,
            },
        })
    }
}
