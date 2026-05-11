import { Prisma, TipoCategoria, TipoLancamento } from "@prisma/client"

type Tx = Prisma.TransactionClient

export type CardFeeInput = {
    taxa_cartao_valor?: number
    taxa_cartao_percentual?: number
}

function normalizeText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}

export function resolveCardFeeAmount(input: CardFeeInput, baseValue: number) {
    const explicitValue = Number(input.taxa_cartao_valor ?? 0)
    if (Number.isFinite(explicitValue) && explicitValue > 0) {
        return Math.round(explicitValue * 100) / 100
    }

    const percentage = Number(input.taxa_cartao_percentual ?? 0)
    if (!Number.isFinite(percentage) || percentage <= 0) return 0

    return Math.round(baseValue * (percentage / 100) * 100) / 100
}

export async function getCardFeeCategoryId(tx: Tx) {
    const parent =
        (await tx.categoria.findFirst({
            where: { nome: "Despesas financeiras", categoria_pai_id: null },
            select: { id: true },
        })) ??
        (await tx.categoria.create({
            data: {
                nome: "Despesas financeiras",
                tipo: TipoCategoria.DESPESA,
                ativo: true,
            },
            select: { id: true },
        }))

    const children = await tx.categoria.findMany({
        where: { categoria_pai_id: parent.id },
        select: { id: true, nome: true },
    })
    const existing = children.find((category) => normalizeText(category.nome) === "taxa de cartao")
    if (existing) return existing.id

    return (await tx.categoria.create({
        data: {
            nome: "Taxa de Cartao",
            tipo: TipoCategoria.DESPESA,
            categoria_pai_id: parent.id,
            ativo: true,
        },
        select: { id: true },
    })).id
}

export async function createCardFeeTransaction(
    tx: Tx,
    input: {
        origemLancamentoId: number
        origemDescricao: string
        valor: number
        dataLancamento: Date
        dataCompetencia: Date
        contaBancariaId: number
        centroCustoId: number | null
        userId?: number
    },
) {
    if (input.valor <= 0) return null

    const categoriaId = await getCardFeeCategoryId(tx)
    return tx.lancamento.create({
        data: {
            tipo: TipoLancamento.DESPESA,
            descricao: `Taxa de cartao: ${input.origemDescricao}`.slice(0, 255),
            valor: input.valor,
            data_lancamento: input.dataLancamento,
            data_competencia: input.dataCompetencia,
            conta_bancaria_id: input.contaBancariaId,
            categoria_id: categoriaId,
            centro_custo_id: input.centroCustoId,
            observacoes: `Ref: Lancamento #${input.origemLancamentoId}`,
            created_by: input.userId,
            lancamento_origem_id: input.origemLancamentoId,
        },
    })
}
