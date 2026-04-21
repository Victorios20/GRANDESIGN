import { prisma } from "@/lib/prisma"
import { syncFixedFinancialCategoryTaxonomy } from "@/actions/financeiro/categories/sync-fixed-taxonomy"
import { getOrCreateActiveCostCenterForWork } from "@/actions/financeiro/cost-centers"
import {
  IntegracaoFinanceiraStatus,
  PedidoCategoria,
  PedidoCompraStatus,
  Prisma,
  StatusFinanceiro,
  TipoCategoria,
  TipoLancamento,
} from "@prisma/client"

const OPERATIONAL_CANCELLATION = "DESINTEGRACAO_OPERACIONAL"
const FINANCIAL_REVERSAL = "ESTORNO_FINANCEIRO"
const DIRECT_COST_GROUP = "Custos diretos"
const DEFAULT_PURCHASE_CATEGORY = "Compra de Material"

const PURCHASE_FINANCIAL_CATEGORY_NAMES: Record<PedidoCategoria, string[]> = {
  [PedidoCategoria.TELHA]: ["Telha", DEFAULT_PURCHASE_CATEGORY],
  [PedidoCategoria.MADEIRA]: ["Madeira", DEFAULT_PURCHASE_CATEGORY],
  [PedidoCategoria.MATERIAIS]: [DEFAULT_PURCHASE_CATEGORY],
  [PedidoCategoria.ANDAIMES]: ["Andaime", DEFAULT_PURCHASE_CATEGORY],
}

type Tx = Prisma.TransactionClient

export type PedidoCompraFinanceiroErrorCode =
  | "PAYLOAD_INVALIDO"
  | "PEDIDO_NAO_ENCONTRADO"
  | "PEDIDOS_NAO_ENCONTRADOS"
  | "PEDIDO_CANCELADO"
  | "PEDIDO_JA_INTEGRADO"
  | "PEDIDO_NAO_INTEGRADO"
  | "PEDIDO_FINANCEIRO_INCONSISTENTE"
  | "PEDIDO_SEM_FORNECEDOR"
  | "PEDIDO_SEM_VALOR"
  | "CATEGORIA_FINANCEIRA_NAO_ENCONTRADA"
  | "INTEGRACAO_FINANCEIRA_FALHOU"
  | "ESTORNO_FINANCEIRO_FALHOU"

export class PedidoCompraFinanceiroError extends Error {
  code: PedidoCompraFinanceiroErrorCode
  step?: string
  details?: Record<string, unknown>

  constructor(code: PedidoCompraFinanceiroErrorCode, message: string, step?: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.step = step
    this.details = details
  }
}

export type PedidoCompraFinanceiroResult = {
  pedidoId: number
  integracaoStatus: IntegracaoFinanceiraStatus
  contaPagarId: number | null
  contaPagarStatus: StatusFinanceiro | null
  valorRealizado: string
  flow: "INTEGRACAO" | "DESINTEGRACAO_OPERACIONAL" | "ESTORNO_FINANCEIRO"
  message: string
}

export type PedidoCompraFinanceiroBulkItemError = {
  pedidoId: number
  code: PedidoCompraFinanceiroErrorCode
  message: string
}

export type PedidoCompraFinanceiroBulkResult = {
  ids: number[]
  processed: PedidoCompraFinanceiroResult[]
  failed: PedidoCompraFinanceiroBulkItemError[]
}

function normalizeIds(ids: number[]) {
  const normalized = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
  if (normalized.length === 0) {
    throw new PedidoCompraFinanceiroError("PAYLOAD_INVALIDO", "Nenhum pedido de compra válido foi informado.", "validate", {
      ids,
    })
  }

  return normalized
}

function asDecimal(value: Prisma.Decimal | number | string | null | undefined) {
  if (value instanceof Prisma.Decimal) return value
  if (value == null || value === "") return new Prisma.Decimal(0)
  return new Prisma.Decimal(String(value).replace(",", "."))
}

function formatDecimal(value: Prisma.Decimal | number | string | null | undefined) {
  return asDecimal(value).toFixed(2)
}

function calculatePedidoAmount(pedido: {
  frete?: Prisma.Decimal | number | string | null
  itens?: Array<{ total: Prisma.Decimal | number | string | null }>
}) {
  const itensTotal = (pedido.itens ?? []).reduce(
    (sum, item) => sum.plus(asDecimal(item.total)),
    new Prisma.Decimal(0)
  )

  return itensTotal.plus(asDecimal(pedido.frete))
}

function truncate(value: string, max = 255) {
  return value.length > max ? value.slice(0, max) : value
}

async function ensurePedidosExist(tx: Tx, ids: number[]) {
  const pedidos = await tx.pedido_compra.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })

  const existing = new Set(pedidos.map((pedido) => pedido.id))
  const missing = ids.filter((id) => !existing.has(id))

  if (missing.length > 0) {
    throw new PedidoCompraFinanceiroError(
      missing.length === 1 ? "PEDIDO_NAO_ENCONTRADO" : "PEDIDOS_NAO_ENCONTRADOS",
      missing.length === 1 ? "Pedido de compra não encontrado." : "Um ou mais pedidos de compra não foram encontrados.",
      "load-pedidos",
      { missingIds: missing }
    )
  }
}

async function resolveExpenseCategoryId(tx: Tx, pedidoCategoria: PedidoCategoria) {
  const categoryNames = PURCHASE_FINANCIAL_CATEGORY_NAMES[pedidoCategoria] ?? [DEFAULT_PURCHASE_CATEGORY]
  const categories = await tx.categoria.findMany({
    where: {
      nome: { in: categoryNames },
      tipo: TipoCategoria.DESPESA,
      ativo: true,
      categoria_pai: {
        nome: DIRECT_COST_GROUP,
        tipo: TipoCategoria.DESPESA,
      },
    },
    select: { id: true, nome: true },
  })

  const categoryByName = new Map(categories.map((category) => [category.nome, category.id]))
  const selectedCategoryId = categoryNames.map((name) => categoryByName.get(name)).find(Boolean)

  if (selectedCategoryId) return selectedCategoryId

  const directCostCategory = await tx.categoria.findFirst({
    where: {
      nome: DIRECT_COST_GROUP,
      tipo: TipoCategoria.DESPESA,
      ativo: true,
    },
    select: { id: true },
  })

  if (directCostCategory) return directCostCategory.id

  throw new PedidoCompraFinanceiroError(
    "CATEGORIA_FINANCEIRA_NAO_ENCONTRADA",
    "Categoria financeira de custos diretos não encontrada.",
    "resolve-categoria",
    { grupo: DIRECT_COST_GROUP, categorias: categoryNames }
  )
}

export async function syncPedidoCompraValorRealizadoInTransaction(tx: Tx, pedidoId: number) {
  // Source of truth: ledger (lancamentos), per ADR-001.
  // Sum all positive DESPESA entries linked to the active ContaPagar of this pedido.
  // Negative entries (estornos) are excluded via valor > 0, so partial payments and
  // reversals are automatically reflected without any special-casing.
  const aggregate = await tx.lancamento.aggregate({
    where: {
      conta_pagar: {
        pedido_compra_id: pedidoId,
        status: { not: StatusFinanceiro.CANCELADO },
      },
      tipo: TipoLancamento.DESPESA,
      valor: { gt: 0 },
    },
    _sum: { valor: true },
  })

  const valorRealizado = aggregate._sum.valor ?? new Prisma.Decimal(0)

  await tx.pedido_compra.update({
    where: { id: pedidoId },
    data: { valor_realizado: valorRealizado },
  })

  return valorRealizado
}

export async function syncPedidoCompraValorRealizado(pedidoId: number) {
  const id = Number(pedidoId)
  if (!Number.isFinite(id) || id <= 0) return null

  return prisma.$transaction(async (tx) => syncPedidoCompraValorRealizadoInTransaction(tx, id))
}

async function buildPedidoIntegrationSnapshot(tx: Tx, pedidoId: number) {
  return tx.pedido_compra.findUnique({
    where: { id: pedidoId },
    select: {
      id: true,
      obra_id: true,
      categoria: true,
      status: true,
      descricao: true,
      valor_orcado: true,
      valor_realizado: true,
      frete: true,
      data_entrega: true,
      fornecedor_id: true,
      financeiro_integracao_status: true,
      itens: {
        select: {
          total: true,
        },
      },
      contas_pagar: {
        where: { status: { not: StatusFinanceiro.CANCELADO } },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          descricao: true,
          status: true,
          valor_total: true,
          valor_pago: true,
          data_pagamento: true,
          categoria_id: true,
          centro_custo_id: true,
          fornecedor_id: true,
          created_at: true,
          lancamentos: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              tipo: true,
              descricao: true,
              valor: true,
              data_lancamento: true,
              data_competencia: true,
              observacoes: true,
              conta_bancaria_id: true,
              categoria_id: true,
              centro_custo_id: true,
            },
          },
        },
      },
    },
  })
}

function assertPedidoCanIntegrate(
  pedido: NonNullable<Awaited<ReturnType<typeof buildPedidoIntegrationSnapshot>>>,
  valorPedido: Prisma.Decimal
) {
  if (pedido.status === PedidoCompraStatus.CANCELADO) {
    throw new PedidoCompraFinanceiroError("PEDIDO_CANCELADO", "Pedido cancelado não pode ser integrado.", "validate", {
      pedidoId: pedido.id,
    })
  }

  if (pedido.financeiro_integracao_status === IntegracaoFinanceiraStatus.INTEGRADO) {
    throw new PedidoCompraFinanceiroError(
      "PEDIDO_JA_INTEGRADO",
      "Pedido já está integrado ao financeiro.",
      "validate",
      { pedidoId: pedido.id }
    )
  }

  if (pedido.contas_pagar.length > 0) {
    throw new PedidoCompraFinanceiroError(
      "PEDIDO_JA_INTEGRADO",
      "Já existe uma conta a pagar ativa vinculada a este pedido.",
      "validate",
      { pedidoId: pedido.id, contaPagarId: pedido.contas_pagar[0]?.id }
    )
  }

  if (!pedido.fornecedor_id) {
    throw new PedidoCompraFinanceiroError(
      "PEDIDO_SEM_FORNECEDOR",
      "Selecione um fornecedor antes de integrar o pedido ao financeiro.",
      "validate",
      { pedidoId: pedido.id }
    )
  }

  if (valorPedido.lte(0)) {
    throw new PedidoCompraFinanceiroError(
      "PEDIDO_SEM_VALOR",
      "Informe itens ou frete com valor maior que zero antes de integrar o pedido ao financeiro.",
      "validate",
      { pedidoId: pedido.id }
    )
  }
}

function assertPedidoCanReverse(
  pedido: NonNullable<Awaited<ReturnType<typeof buildPedidoIntegrationSnapshot>>>
) {
  if (pedido.financeiro_integracao_status !== IntegracaoFinanceiraStatus.INTEGRADO) {
    throw new PedidoCompraFinanceiroError(
      "PEDIDO_NAO_INTEGRADO",
      "Pedido não está com integração financeira ativa.",
      "validate",
      { pedidoId: pedido.id }
    )
  }

  if (pedido.contas_pagar.length === 0) {
    throw new PedidoCompraFinanceiroError(
      "PEDIDO_FINANCEIRO_INCONSISTENTE",
      "Pedido está marcado como integrado, mas não possui conta a pagar ativa vinculada.",
      "validate",
      { pedidoId: pedido.id }
    )
  }
}

async function auditPedidoFinanceiro(
  tx: Tx,
  userId: number | undefined,
  pedidoId: number,
  action: string,
  detail: Record<string, unknown>
) {
  await tx.auditLog.create({
    data: {
      user_id: userId ?? null,
      action,
      entity: "pedido_compra",
      entity_id: pedidoId,
      detail: detail as Prisma.InputJsonValue,
    },
  })
}

export async function integrarPedidoCompraAoFinanceiro(
  pedidoId: number,
  userId?: number
): Promise<PedidoCompraFinanceiroResult> {
  const id = Number(pedidoId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new PedidoCompraFinanceiroError("PAYLOAD_INVALIDO", "pedidoCompraId inválido.", "validate", { pedidoId })
  }

  await syncFixedFinancialCategoryTaxonomy()

  return prisma.$transaction(
    async (tx) => {
      const pedido = await buildPedidoIntegrationSnapshot(tx, id)
      if (!pedido) {
        throw new PedidoCompraFinanceiroError("PEDIDO_NAO_ENCONTRADO", "Pedido de compra não encontrado.", "load-pedido", {
          pedidoId: id,
        })
      }

      const valorPedido = calculatePedidoAmount(pedido)

      assertPedidoCanIntegrate(pedido, valorPedido)

      try {
        const categoriaId = await resolveExpenseCategoryId(tx, pedido.categoria)
        const centroCusto = await getOrCreateActiveCostCenterForWork(tx, pedido.obra_id)

        const now = new Date()
        const descricao = truncate(
          pedido.descricao?.trim() || `Pedido de compra #${pedido.id}`,
          200
        )

        const contaPagar = await tx.contaPagar.create({
          data: {
            descricao,
            valor_total: valorPedido,
            valor_pago: new Prisma.Decimal(0),
            data_emissao: now,
            data_vencimento: pedido.data_entrega ?? now,
            status: StatusFinanceiro.PENDENTE,
            fornecedor_id: pedido.fornecedor_id,
            categoria_id: categoriaId,
            centro_custo_id: centroCusto?.id ?? null,
            pedido_compra_id: pedido.id,
            observacoes: `Integração financeira explícita do pedido de compra #${pedido.id}.`,
            created_by: userId,
            updated_by: userId,
          },
          select: {
            id: true,
            status: true,
            valor_total: true,
          },
        })

        await tx.pedido_compra.update({
          where: { id: pedido.id },
          data: {
            financeiro_integracao_status: IntegracaoFinanceiraStatus.INTEGRADO,
            financeiro_integrado_em: now,
            financeiro_integrado_por: userId ?? null,
            financeiro_estornado_em: null,
            financeiro_estornado_por: null,
            valor_realizado: contaPagar.valor_total,
          },
        })

        await auditPedidoFinanceiro(tx, userId, pedido.id, "PEDIDO_COMPRA_FINANCEIRO_INTEGRADO", {
          conta_pagar_id: contaPagar.id,
          conta_pagar_status: contaPagar.status,
          valor_pedido: formatDecimal(valorPedido),
          categoria_id: categoriaId,
          centro_custo_id: centroCusto?.id ?? null,
        })

        return {
          pedidoId: pedido.id,
          integracaoStatus: IntegracaoFinanceiraStatus.INTEGRADO,
          contaPagarId: contaPagar.id,
          contaPagarStatus: contaPagar.status,
          valorRealizado: formatDecimal(contaPagar.valor_total),
          flow: "INTEGRACAO" as const,
          message: "Pedido integrado ao financeiro com sucesso.",
        }
      } catch (error) {
        if (error instanceof PedidoCompraFinanceiroError) throw error

        throw new PedidoCompraFinanceiroError(
          "INTEGRACAO_FINANCEIRA_FALHOU",
          "Falha ao integrar pedido ao financeiro.",
          "integrate",
          { pedidoId: id, error: error instanceof Error ? error.message : String(error) }
        )
      }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}

export async function integrarPedidosCompraAoFinanceiro(
  pedidoCompraIds: number[],
  userId?: number
): Promise<PedidoCompraFinanceiroBulkResult> {
  const ids = normalizeIds(pedidoCompraIds)
  await prisma.$transaction(async (tx) => ensurePedidosExist(tx, ids))

  const processed: PedidoCompraFinanceiroResult[] = []
  const failed: PedidoCompraFinanceiroBulkItemError[] = []

  for (const id of ids) {
    try {
      processed.push(await integrarPedidoCompraAoFinanceiro(id, userId))
    } catch (error) {
      if (error instanceof PedidoCompraFinanceiroError) {
        failed.push({ pedidoId: id, code: error.code, message: error.message })
        continue
      }

      throw error
    }
  }

  return { ids, processed, failed }
}

function hasFinancialImpact(payable: {
  valor_pago: Prisma.Decimal
  lancamentos: Array<{ id: number }>
}) {
  return Number(payable.valor_pago ?? 0) > 0 || payable.lancamentos.length > 0
}

async function createReverseLancamentos(tx: Tx, pedidoId: number, contaPagarId: number, userId: number | undefined) {
  const payable = await tx.contaPagar.findUnique({
    where: { id: contaPagarId },
    select: {
      id: true,
      lancamentos: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          tipo: true,
          descricao: true,
          valor: true,
          data_competencia: true,
          conta_bancaria_id: true,
          categoria_id: true,
          centro_custo_id: true,
        },
      },
    },
  })

  if (!payable) return 0

  const reversalDate = new Date()

  for (const lancamento of payable.lancamentos) {
    const valor = asDecimal(lancamento.valor)

    await tx.lancamento.create({
      data: {
        tipo: lancamento.tipo,
        descricao: truncate(`Estorno: ${lancamento.descricao}`),
        valor: valor.negated(),
        data_lancamento: reversalDate,
        data_competencia: reversalDate,
        observacoes: `Estorno do lançamento #${lancamento.id} da conta a pagar #${contaPagarId} para liberar edição do pedido #${pedidoId}.`,
        conta_bancaria_id: lancamento.conta_bancaria_id,
        categoria_id: lancamento.categoria_id,
        centro_custo_id: lancamento.centro_custo_id,
        conta_pagar_id: contaPagarId,
        created_by: userId,
      },
    })

    if (lancamento.tipo === TipoLancamento.DESPESA && lancamento.conta_bancaria_id) {
      await tx.contasBancaria.update({
        where: { id: lancamento.conta_bancaria_id },
        data: { saldo_atual: { increment: valor } },
      })
      continue
    }

    if (lancamento.conta_bancaria_id) {
      await tx.contasBancaria.update({
        where: { id: lancamento.conta_bancaria_id },
        data: { saldo_atual: { decrement: valor } },
      })
    }
  }

  return payable.lancamentos.length
}

export async function estornarIntegracaoFinanceiraPedido(
  pedidoId: number,
  userId?: number
): Promise<PedidoCompraFinanceiroResult> {
  const id = Number(pedidoId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new PedidoCompraFinanceiroError("PAYLOAD_INVALIDO", "pedidoCompraId inválido.", "validate", { pedidoId })
  }

  return prisma.$transaction(
    async (tx) => {
      const pedido = await buildPedidoIntegrationSnapshot(tx, id)
      if (!pedido) {
        throw new PedidoCompraFinanceiroError("PEDIDO_NAO_ENCONTRADO", "Pedido de compra não encontrado.", "load-pedido", {
          pedidoId: id,
        })
      }

      assertPedidoCanReverse(pedido)
      const payable = pedido.contas_pagar[0]
      const now = new Date()
      const impacted = hasFinancialImpact(payable)

      try {
        let flow: PedidoCompraFinanceiroResult["flow"] = "DESINTEGRACAO_OPERACIONAL"
        let message = "Integração financeira cancelada e pedido liberado para edição."

        if (impacted) {
          const reversalCount = await createReverseLancamentos(tx, pedido.id, payable.id, userId)

          await tx.contaPagar.update({
            where: { id: payable.id },
            data: {
              status: StatusFinanceiro.CANCELADO,
              valor_pago: new Prisma.Decimal(0),
              cancelamento_tipo: FINANCIAL_REVERSAL,
              cancelado_em: now,
              cancelado_por: userId ?? null,
              cancelamento_observacao: `Estorno financeiro do pedido #${pedido.id} com ${reversalCount} lançamento(s) reverso(s).`,
              updated_by: userId ?? null,
            },
          })

          flow = "ESTORNO_FINANCEIRO"
          message = "Estorno financeiro concluído e pedido liberado para edição."
        } else {
          await tx.contaPagar.update({
            where: { id: payable.id },
            data: {
              status: StatusFinanceiro.CANCELADO,
              cancelamento_tipo: OPERATIONAL_CANCELLATION,
              cancelado_em: now,
              cancelado_por: userId ?? null,
              cancelamento_observacao: `Desintegração operacional do pedido #${pedido.id} sem pagamentos registrados.`,
              updated_by: userId ?? null,
            },
          })
        }

        await tx.pedido_compra.update({
          where: { id: pedido.id },
          data: {
            financeiro_integracao_status: IntegracaoFinanceiraStatus.ESTORNADO,
            financeiro_estornado_em: now,
            financeiro_estornado_por: userId ?? null,
          },
        })

        const valorRealizado = await syncPedidoCompraValorRealizadoInTransaction(tx, pedido.id)

        await auditPedidoFinanceiro(tx, userId, pedido.id, "PEDIDO_COMPRA_FINANCEIRO_ESTORNADO", {
          conta_pagar_id: payable.id,
          flow,
          conta_pagar_status_final: StatusFinanceiro.CANCELADO,
          valor_realizado_final: formatDecimal(valorRealizado),
        })

        return {
          pedidoId: pedido.id,
          integracaoStatus: IntegracaoFinanceiraStatus.ESTORNADO,
          contaPagarId: payable.id,
          contaPagarStatus: StatusFinanceiro.CANCELADO,
          valorRealizado: formatDecimal(valorRealizado),
          flow,
          message,
        }
      } catch (error) {
        if (error instanceof PedidoCompraFinanceiroError) throw error

        throw new PedidoCompraFinanceiroError(
          "ESTORNO_FINANCEIRO_FALHOU",
          "Falha ao estornar a integração financeira do pedido.",
          "reverse",
          { pedidoId: id, error: error instanceof Error ? error.message : String(error) }
        )
      }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}

export async function estornarIntegracaoFinanceiraPedidos(
  pedidoCompraIds: number[],
  userId?: number
): Promise<PedidoCompraFinanceiroBulkResult> {
  const ids = normalizeIds(pedidoCompraIds)
  await prisma.$transaction(async (tx) => ensurePedidosExist(tx, ids))

  const processed: PedidoCompraFinanceiroResult[] = []
  const failed: PedidoCompraFinanceiroBulkItemError[] = []

  for (const id of ids) {
    try {
      processed.push(await estornarIntegracaoFinanceiraPedido(id, userId))
    } catch (error) {
      if (error instanceof PedidoCompraFinanceiroError) {
        failed.push({ pedidoId: id, code: error.code, message: error.message })
        continue
      }

      throw error
    }
  }

  return { ids, processed, failed }
}
