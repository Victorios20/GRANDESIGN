import type { ListarResult, PedidoStatus, PurchaseOrderStatusSlug } from "@/types/pedido-compra"

type FetchListParams = {
  q?: string
  status?: PurchaseOrderStatusSlug
  obraId?: number | null
}

const PEDIDO_ERROR_BY_CODE: Record<string, string> = {
  PEDIDO_SEM_FORNECEDOR: "Selecione um fornecedor no pedido antes de integrar ao financeiro.",
  PEDIDO_SEM_VALOR: "O pedido não tem valor (itens/frete) para gerar a conta a pagar.",
  PEDIDO_JA_INTEGRADO: "Este pedido já está integrado ao financeiro.",
  PEDIDO_NAO_INTEGRADO: "Este pedido não está integrado ao financeiro.",
  PEDIDO_CANCELADO: "Pedido cancelado não pode ser integrado ao financeiro.",
  PEDIDO_INTEGRADO_FINANCEIRO: "Estorne a integração financeira antes de excluir o pedido.",
  CATEGORIA_FINANCEIRA_NAO_ENCONTRADA: "Categoria financeira não encontrada para o pedido.",
}

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "object" && body !== null) {
    const maybeCode = "code" in body ? body.code : null
    if (typeof maybeCode === "string" && PEDIDO_ERROR_BY_CODE[maybeCode]) {
      return PEDIDO_ERROR_BY_CODE[maybeCode]
    }

    const maybeError = "error" in body ? body.error : null
    const maybeMessage = "message" in body ? body.message : null

    if (typeof maybeError === "string" && maybeError) return maybeError
    if (typeof maybeMessage === "string" && maybeMessage) return maybeMessage
  }

  return fallback
}

export async function fetchPedidoCompraList(params: FetchListParams) {
  const searchParams = new URLSearchParams()
  searchParams.set("page", "1")
  searchParams.set("pageSize", "100")

  if (params.q) searchParams.set("q", params.q)
  if (params.status && params.status !== "todos") searchParams.set("status", params.status)
  if (params.obraId && params.obraId > 0) searchParams.set("obraId", String(params.obraId))

  const response = await fetch(`/api/pedido_compra/listar?${searchParams.toString()}`, { cache: "no-store" })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao listar pedidos"))
  }

  return (body?.data ?? { items: [], page: 1, pageSize: 100, total: 0, totalPages: 1 }) as ListarResult
}

export async function updatePedidoCompraStatusRequest(pedidoId: string | number, status: PedidoStatus) {
  const response = await fetch(`/api/pedido_compra/status/${pedidoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao atualizar status"))
  }

  return body?.data
}

export async function updatePedidoCompraStatusBulkRequest(ids: Array<string | number>, status: PedidoStatus) {
  const response = await fetch("/api/pedido_compra/status/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, status }),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao atualizar status em massa"))
  }

  return body?.data
}

export async function deletePedidoCompraRequest(pedidoId: string | number) {
  const response = await fetch(`/api/pedido_compra/excluir/${pedidoId}`, { method: "DELETE" })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao excluir pedido"))
  }

  return body?.data
}

export async function deletePedidoCompraBulkRequest(ids: Array<string | number>) {
  const response = await fetch("/api/pedido_compra/excluir/bulk", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao excluir pedidos"))
  }

  return body?.data
}

export async function integratePedidoCompraRequest(pedidoId: string | number) {
  const response = await fetch(`/api/pedido_compra/integrar/${pedidoId}`, { method: "POST" })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao integrar pedido ao financeiro"))
  }

  return body?.data
}

export async function integratePedidoCompraBulkRequest(ids: Array<string | number>) {
  const response = await fetch("/api/pedido_compra/integrar/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao integrar pedidos ao financeiro"))
  }

  return body?.data
}

export async function reversePedidoCompraIntegrationRequest(pedidoId: string | number) {
  const response = await fetch(`/api/pedido_compra/estornar/${pedidoId}`, { method: "POST" })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao estornar integração financeira"))
  }

  return body?.data
}

export async function reversePedidoCompraIntegrationBulkRequest(ids: Array<string | number>) {
  const response = await fetch("/api/pedido_compra/estornar/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Falha ao estornar integrações financeiras"))
  }

  return body?.data
}
