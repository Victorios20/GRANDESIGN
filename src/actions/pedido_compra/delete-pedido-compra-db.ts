import { prisma } from "@/lib/prisma"

export type PedidoCompraDeleteErrorCode =
  | "PAYLOAD_INVALIDO"
  | "PEDIDO_NAO_ENCONTRADO"
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

export async function excluirPedidoCompra(
  pedidoCompraId: number,
  actorUserId: number
): Promise<ExcluirPedidoCompraResult> {
  if (!Number.isFinite(Number(pedidoCompraId))) {
    throw new PedidoCompraDeleteError("PAYLOAD_INVALIDO", "pedidoCompraId invÃ¡lido.", "validate", {
      field: "pedidoCompraId",
    })
  }

  return await prisma.$transaction(
    async (tx) => {
      const existing = await tx.pedido_compra.findUnique({
        where: { id: Number(pedidoCompraId) },
        select: { id: true },
      })
      if (!existing) {
        throw new PedidoCompraDeleteError("PEDIDO_NAO_ENCONTRADO", "Pedido de compra nÃ£o encontrado.", "load-pedido", {
          pedidoCompraId,
        })
      }

      let itensRemovidos = 0
      try {
        const deleted = await tx.pedido_itens.deleteMany({ where: { pedido_compra_id: Number(pedidoCompraId) } })
        itensRemovidos = deleted.count ?? 0
      } catch (err: any) {
        throw new PedidoCompraDeleteError("ITENS_DELETE_FAILED", "Erro ao remover itens do pedido.", "delete-itens", {
          err: String(err?.message ?? ""),
        })
      }

      try {
        await tx.pedido_compra.delete({ where: { id: Number(pedidoCompraId) } })
      } catch (err: any) {
        throw new PedidoCompraDeleteError("PEDIDO_DELETE_FAILED", "Erro ao excluir pedido_compra.", "delete-pedido", {
          err: String(err?.message ?? ""),
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
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}
