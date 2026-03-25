import { prisma } from "@/lib/prisma"
import { IntegracaoFinanceiraStatus, PedidoCompraStatus, Prisma } from "@prisma/client"

export type PedidoCompraStatusErrorCode =
  | "PAYLOAD_INVALIDO"
  | "STATUS_INVALIDO"
  | "PEDIDO_NAO_ENCONTRADO"
  | "PEDIDOS_NAO_ENCONTRADOS"
  | "PEDIDO_INTEGRADO_FINANCEIRO"
  | "STATUS_UPDATE_FAILED"

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

async function updatePedidoCompraStatusInTx(
  tx: Prisma.TransactionClient,
  pedidoCompraId: number,
  nextStatus: PedidoCompraStatus
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

  try {
    return await tx.pedido_compra.update({
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
}

export async function atualizarStatusPedidoCompra(
  pedidoCompraId: number,
  rawStatus: unknown
): Promise<AtualizarStatusPedidoCompraResult> {
  const id = Number(pedidoCompraId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new PedidoCompraStatusError("PAYLOAD_INVALIDO", "pedidoCompraId inválido.", "validate", { pedidoCompraId })
  }

  const nextStatus = parsePedidoCompraStatus(rawStatus)
  if (!nextStatus) {
    throw new PedidoCompraStatusError("STATUS_INVALIDO", "Status inválido.", "validate", { rawStatus })
  }

  return prisma.$transaction(
    async (tx) => {
      await ensurePedidosExist(tx, [id])
      return updatePedidoCompraStatusInTx(tx, id, nextStatus)
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}

export async function atualizarStatusPedidosCompra(
  pedidoCompraIds: number[],
  rawStatus: unknown
): Promise<AtualizarStatusPedidosCompraResult> {
  const ids = normalizeIds(pedidoCompraIds)
  const nextStatus = parsePedidoCompraStatus(rawStatus)

  if (!nextStatus) {
    throw new PedidoCompraStatusError("STATUS_INVALIDO", "Status inválido.", "validate", { rawStatus })
  }

  return prisma.$transaction(
    async (tx) => {
      await ensurePedidosExist(tx, ids)

      const updated: AtualizarStatusPedidoCompraResult[] = []
      for (const id of ids) {
        updated.push(await updatePedidoCompraStatusInTx(tx, id, nextStatus))
      }

      return { ids, updated }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}
