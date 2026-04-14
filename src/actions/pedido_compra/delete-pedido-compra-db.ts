import { prisma } from "@/lib/prisma"
import { IntegracaoFinanceiraStatus, Prisma } from "@prisma/client"

export type PedidoCompraDeleteErrorCode =
  | "PAYLOAD_INVALIDO"
  | "PEDIDO_NAO_ENCONTRADO"
  | "PEDIDO_INTEGRADO_FINANCEIRO"
  | "ITENS_DELETE_FAILED"
  | "PEDIDO_DELETE_FAILED"
  | "AUDIT_FAILED"

export class PedidoCompraDeleteError extends Error {
  code: PedidoCompraDeleteErrorCode
  step?: string
  details?: Record<string, unknown>

  constructor(code: PedidoCompraDeleteErrorCode, message: string, step?: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.step = step
    this.details = details
  }
}

export type ExcluirPedidoCompraResult = {
  pedidoCompraId: number
  itensRemovidos: number
}

export type ExcluirPedidosCompraResult = {
  ids: number[]
  deletedCount: number
  itensRemovidos: number
  results: ExcluirPedidoCompraResult[]
}

function normalizePedidoIds(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
  if (uniqueIds.length === 0) {
    throw new PedidoCompraDeleteError("PAYLOAD_INVALIDO", "Nenhum pedido de compra válido foi informado.", "validate", {
      ids,
    })
  }
  return uniqueIds
}

async function excluirPedidoCompraInTx(
  tx: Prisma.TransactionClient,
  pedidoCompraId: number,
  actorUserId: number
): Promise<ExcluirPedidoCompraResult> {
  if (!Number.isFinite(Number(pedidoCompraId))) {
    throw new PedidoCompraDeleteError("PAYLOAD_INVALIDO", "pedidoCompraId inválido.", "validate", {
      field: "pedidoCompraId",
    })
  }

  const existing = await tx.pedido_compra.findUnique({
    where: { id: Number(pedidoCompraId) },
    select: { id: true, financeiro_integracao_status: true },
  })

  if (!existing) {
    throw new PedidoCompraDeleteError("PEDIDO_NAO_ENCONTRADO", "Pedido de compra não encontrado.", "load-pedido", {
      pedidoCompraId,
    })
  }

  if (existing.financeiro_integracao_status === IntegracaoFinanceiraStatus.INTEGRADO) {
    throw new PedidoCompraDeleteError(
      "PEDIDO_INTEGRADO_FINANCEIRO",
      "Estorne a integração financeira antes de excluir o pedido.",
      "validate-financial-lock",
      { pedidoCompraId }
    )
  }

  let itensRemovidos = 0
  try {
    const deleted = await tx.pedido_itens.deleteMany({ where: { pedido_compra_id: Number(pedidoCompraId) } })
    itensRemovidos = deleted.count ?? 0
  } catch (error: any) {
    throw new PedidoCompraDeleteError("ITENS_DELETE_FAILED", "Erro ao remover itens do pedido.", "delete-itens", {
      error: String(error?.message ?? ""),
      pedidoCompraId,
    })
  }

  try {
    await tx.pedido_compra.delete({ where: { id: Number(pedidoCompraId) } })
  } catch (error: any) {
    throw new PedidoCompraDeleteError("PEDIDO_DELETE_FAILED", "Erro ao excluir pedido_compra.", "delete-pedido", {
      error: String(error?.message ?? ""),
      pedidoCompraId,
    })
  }

  try {
    await tx.auditLog.create({
      data: {
        user_id: actorUserId ?? null,
        action: "PEDIDO_COMPRA_DELETE",
        entity: "pedido_compra",
        entity_id: Number(pedidoCompraId),
        detail: {
          itens_removidos: itensRemovidos,
        },
      },
    })
  } catch {
    // best effort
  }

  return { pedidoCompraId: Number(pedidoCompraId), itensRemovidos }
}

export async function excluirPedidoCompra(
  pedidoCompraId: number,
  actorUserId: number
): Promise<ExcluirPedidoCompraResult> {
  return prisma.$transaction(
    async (tx) => excluirPedidoCompraInTx(tx, pedidoCompraId, actorUserId),
    { timeout: 120_000, maxWait: 20_000 }
  )
}

export async function excluirPedidosCompra(
  pedidoCompraIds: number[],
  actorUserId: number
): Promise<ExcluirPedidosCompraResult> {
  const ids = normalizePedidoIds(pedidoCompraIds)

  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.pedido_compra.findMany({
        where: { id: { in: ids } },
        select: { id: true, financeiro_integracao_status: true },
      })

      const existingIds = new Set(existing.map((item) => item.id))
      const missingIds = ids.filter((id) => !existingIds.has(id))

      if (missingIds.length > 0) {
        throw new PedidoCompraDeleteError(
          "PEDIDO_NAO_ENCONTRADO",
          missingIds.length === 1
            ? "Pedido de compra não encontrado."
            : "Um ou mais pedidos de compra não foram encontrados.",
          "load-pedidos",
          { missingIds }
        )
      }

      const integratedIds = existing
        .filter((item) => item.financeiro_integracao_status === IntegracaoFinanceiraStatus.INTEGRADO)
        .map((item) => item.id)

      if (integratedIds.length > 0) {
        throw new PedidoCompraDeleteError(
          "PEDIDO_INTEGRADO_FINANCEIRO",
          "Estorne a integração financeira antes de excluir pedidos integrados.",
          "validate-financial-lock",
          { integratedIds }
        )
      }

      const results: ExcluirPedidoCompraResult[] = []
      for (const id of ids) {
        results.push(await excluirPedidoCompraInTx(tx, id, actorUserId))
      }

      return {
        ids,
        deletedCount: results.length,
        itensRemovidos: results.reduce((acc, item) => acc + item.itensRemovidos, 0),
        results,
      }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}
