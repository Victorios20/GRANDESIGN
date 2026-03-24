import type { ListarResult, PedidoStatus, PurchaseOrderStatusSlug } from "@/types/pedido-compra"

type FetchListParams = {
  q?: string
  status?: PurchaseOrderStatusSlug
  obraId?: number | null
}

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "object" && body !== null) {
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
