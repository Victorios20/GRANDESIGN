import { prisma } from "@/lib/prisma"
import { IntegracaoFinanceiraStatus, PedidoCompraStatus, Prisma, StatusFinanceiro } from "@prisma/client"
import { syncFixedFinancialCategoryTaxonomy } from "@/actions/financeiro/categories/sync-fixed-taxonomy"
import {
  calculatePedidoAmount,
  integrarPedidoCompraAoFinanceiroInTransaction,
  PedidoCompraFinanceiroError,
} from "@/actions/pedido_compra/manage-finance-integration"

export type PedidoCompraStatusErrorCode =
  | "PAYLOAD_INVALIDO"
  | "STATUS_INVALIDO"
  | "PEDIDO_NAO_ENCONTRADO"
  | "PEDIDOS_NAO_ENCONTRADOS"
  | "PEDIDO_INTEGRADO_FINANCEIRO"
  | "PEDIDO_SEM_FORNECEDOR"
  | "PEDIDO_SEM_VALOR"
  | "INTEGRACAO_AUTOMATICA_FALHOU"
  | "STATUS_UPDATE_FAILED"

/**
 * Ordem do fluxo de status (CANCELADO é tratado à parte, fora da ordem).
 * Usada para validar "APROVADO ou além" e disparar a integração automática
 * a partir de AGUARDANDO_PAGAMENTO.
 */
const STATUS_FLOW_ORDER: PedidoCompraStatus[] = [
  PedidoCompraStatus.RASCUNHO,
  PedidoCompraStatus.PENDENTE,
  PedidoCompraStatus.APROVADO,
  PedidoCompraStatus.EM_COMPRA,
  PedidoCompraStatus.AGUARDANDO_PAGAMENTO,
  PedidoCompraStatus.AGUARDANDO_ENTREGA,
  PedidoCompraStatus.ENTREGUE,
]

function isStatusAtLeast(status: PedidoCompraStatus, threshold: PedidoCompraStatus) {
  const statusIndex = STATUS_FLOW_ORDER.indexOf(status)
  const thresholdIndex = STATUS_FLOW_ORDER.indexOf(threshold)
  if (statusIndex < 0 || thresholdIndex < 0) return false
  return statusIndex >= thresholdIndex
}

/** A partir deste status a conta a pagar é lançada automaticamente. */
function isAutoIntegrationStatus(status: PedidoCompraStatus) {
  return isStatusAtLeast(status, PedidoCompraStatus.AGUARDANDO_PAGAMENTO)
}

/** A partir deste status fornecedor + valor passam a ser obrigatórios. */
function requiresApprovalData(status: PedidoCompraStatus) {
  return isStatusAtLeast(status, PedidoCompraStatus.APROVADO)
}

export class PedidoCompraStatusError extends Error {
  code: PedidoCompraStatusErrorCode
  step?: string
  details?: Record<string, unknown>

  constructor(code: PedidoCompraStatusErrorCode, message: string, step?: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.step = step
    this.details = details
  }
}

export type AtualizarStatusPedidoCompraResult = {
  id: number
  status: PedidoCompraStatus
  updated_at: Date
}

export type AtualizarStatusPedidosCompraResult = {
  ids: number[]
  updated: AtualizarStatusPedidoCompraResult[]
}

function normalizeStr(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export function parsePedidoCompraStatus(raw: unknown): PedidoCompraStatus | null {
  const value = String(raw ?? "").trim()
  if (!value) return null

  if (Object.values(PedidoCompraStatus).includes(value as PedidoCompraStatus)) {
    return value as PedidoCompraStatus
  }

  const normalized = normalizeStr(value).replace(/[_-]/g, " ")

  if (normalized === "rascunho") return PedidoCompraStatus.RASCUNHO
  if (normalized === "pendente") return PedidoCompraStatus.PENDENTE
  if (normalized === "aprovado") return PedidoCompraStatus.APROVADO
  if (normalized === "em compra" || normalized === "emcompra") return PedidoCompraStatus.EM_COMPRA
  if (normalized === "aguardando pagamento" || normalized === "aguardandopagamento") {
    return PedidoCompraStatus.AGUARDANDO_PAGAMENTO
  }
  if (normalized === "aguardando entrega" || normalized === "aguardandoentrega") {
    return PedidoCompraStatus.AGUARDANDO_ENTREGA
  }
  if (normalized === "entregue") return PedidoCompraStatus.ENTREGUE
  if (normalized === "cancelado") return PedidoCompraStatus.CANCELADO

  return null
}

function normalizeIds(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
  if (uniqueIds.length === 0) {
    throw new PedidoCompraStatusError("PAYLOAD_INVALIDO", "Nenhum pedido de compra válido foi informado.", "validate", {
      ids,
    })
  }
  return uniqueIds
}

async function ensurePedidosExist(
  tx: Prisma.TransactionClient,
  ids: number[]
) {
  const existing = await tx.pedido_compra.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })

  const existingIds = new Set(existing.map((item) => item.id))
  const missingIds = ids.filter((id) => !existingIds.has(id))

  if (missingIds.length > 0) {
    throw new PedidoCompraStatusError(
      missingIds.length === 1 ? "PEDIDO_NAO_ENCONTRADO" : "PEDIDOS_NAO_ENCONTRADOS",
      missingIds.length === 1 ? "Pedido de compra não encontrado." : "Um ou mais pedidos de compra não foram encontrados.",
      "load-pedidos",
      { missingIds }
    )
  }
}

/**
 * Valida que o pedido tem fornecedor e valor > 0 antes de avançar para
 * APROVADO ou status posterior. Reaproveita `calculatePedidoAmount`.
 */
async function assertPedidoPodeSerAprovado(tx: Prisma.TransactionClient, pedidoCompraId: number) {
  const pedido = await tx.pedido_compra.findUnique({
    where: { id: pedidoCompraId },
    select: {
      fornecedor_id: true,
      frete: true,
      itens: { select: { total: true } },
    },
  })

  if (!pedido) {
    throw new PedidoCompraStatusError("PEDIDO_NAO_ENCONTRADO", "Pedido de compra não encontrado.", "validate-approval", {
      pedidoCompraId,
    })
  }

  if (!pedido.fornecedor_id) {
    throw new PedidoCompraStatusError(
      "PEDIDO_SEM_FORNECEDOR",
      "Selecione um fornecedor antes de aprovar o pedido.",
      "validate-approval",
      { pedidoCompraId }
    )
  }

  if (calculatePedidoAmount(pedido).lte(0)) {
    throw new PedidoCompraStatusError(
      "PEDIDO_SEM_VALOR",
      "Informe itens ou frete com valor maior que zero antes de aprovar o pedido.",
      "validate-approval",
      { pedidoCompraId }
    )
  }
}

/**
 * Integra o pedido ao financeiro automaticamente quando ainda não há
 * integração ativa. Idempotente: se já estiver integrado ou já houver conta a
 * pagar ativa vinculada, não faz nada.
 */
async function maybeAutoIntegrarPedido(
  tx: Prisma.TransactionClient,
  pedidoCompraId: number,
  userId?: number
) {
  const pedido = await tx.pedido_compra.findUnique({
    where: { id: pedidoCompraId },
    select: {
      financeiro_integracao_status: true,
      contas_pagar: {
        where: { status: { not: StatusFinanceiro.CANCELADO } },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!pedido) return
  if (pedido.financeiro_integracao_status === IntegracaoFinanceiraStatus.INTEGRADO) return
  if (pedido.contas_pagar.length > 0) return

  try {
    await integrarPedidoCompraAoFinanceiroInTransaction(tx, pedidoCompraId, userId, "AUTOMATICA")
  } catch (error) {
    if (error instanceof PedidoCompraFinanceiroError) {
      throw new PedidoCompraStatusError(
        error.code === "PEDIDO_SEM_FORNECEDOR"
          ? "PEDIDO_SEM_FORNECEDOR"
          : error.code === "PEDIDO_SEM_VALOR"
            ? "PEDIDO_SEM_VALOR"
            : "INTEGRACAO_AUTOMATICA_FALHOU",
        error.message,
        "auto-integrate",
        { pedidoCompraId, integrationCode: error.code }
      )
    }
    throw error
  }
}

async function updatePedidoCompraStatusInTx(
  tx: Prisma.TransactionClient,
  pedidoCompraId: number,
  nextStatus: PedidoCompraStatus,
  userId?: number
) {
  if (nextStatus === PedidoCompraStatus.CANCELADO) {
    const pedido = await tx.pedido_compra.findUnique({
      where: { id: pedidoCompraId },
      select: { financeiro_integracao_status: true },
    })

    if (pedido?.financeiro_integracao_status === IntegracaoFinanceiraStatus.INTEGRADO) {
      throw new PedidoCompraStatusError(
        "PEDIDO_INTEGRADO_FINANCEIRO",
        "Estorne a integração financeira antes de cancelar o pedido.",
        "validate-financial-lock",
        { pedidoCompraId }
      )
    }
  }

  if (requiresApprovalData(nextStatus)) {
    await assertPedidoPodeSerAprovado(tx, pedidoCompraId)
  }

  let updated
  try {
    updated = await tx.pedido_compra.update({
      where: { id: pedidoCompraId },
      data: { status: nextStatus },
      select: { id: true, status: true, updated_at: true },
    })
  } catch (error: unknown) {
    throw new PedidoCompraStatusError(
      "STATUS_UPDATE_FAILED",
      "Erro ao atualizar o status do pedido.",
      "update-status",
      { pedidoCompraId, error: error instanceof Error ? error.message : String(error) }
    )
  }

  if (isAutoIntegrationStatus(nextStatus)) {
    await maybeAutoIntegrarPedido(tx, pedidoCompraId, userId)
  }

  return updated
}

export async function atualizarStatusPedidoCompra(
  pedidoCompraId: number,
  rawStatus: unknown,
  userId?: number
): Promise<AtualizarStatusPedidoCompraResult> {
  const id = Number(pedidoCompraId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new PedidoCompraStatusError("PAYLOAD_INVALIDO", "pedidoCompraId inválido.", "validate", { pedidoCompraId })
  }

  const nextStatus = parsePedidoCompraStatus(rawStatus)
  if (!nextStatus) {
    throw new PedidoCompraStatusError("STATUS_INVALIDO", "Status inválido.", "validate", { rawStatus })
  }

  // A integração automática cria contas a pagar usando a taxonomia fixa de
  // categorias; ela faz writes próprios e precisa rodar antes da transação.
  if (isAutoIntegrationStatus(nextStatus)) {
    await syncFixedFinancialCategoryTaxonomy()
  }

  return prisma.$transaction(
    async (tx) => {
      await ensurePedidosExist(tx, [id])
      return updatePedidoCompraStatusInTx(tx, id, nextStatus, userId)
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}

export async function atualizarStatusPedidosCompra(
  pedidoCompraIds: number[],
  rawStatus: unknown,
  userId?: number
): Promise<AtualizarStatusPedidosCompraResult> {
  const ids = normalizeIds(pedidoCompraIds)
  const nextStatus = parsePedidoCompraStatus(rawStatus)

  if (!nextStatus) {
    throw new PedidoCompraStatusError("STATUS_INVALIDO", "Status inválido.", "validate", { rawStatus })
  }

  if (isAutoIntegrationStatus(nextStatus)) {
    await syncFixedFinancialCategoryTaxonomy()
  }

  return prisma.$transaction(
    async (tx) => {
      await ensurePedidosExist(tx, ids)

      const updated: AtualizarStatusPedidoCompraResult[] = []
      for (const id of ids) {
        updated.push(await updatePedidoCompraStatusInTx(tx, id, nextStatus, userId))
      }

      return { ids, updated }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}
