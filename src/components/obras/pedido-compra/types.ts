import { formatDateOnlyLongPtBr, formatDateOnlyPtBr } from "@/lib/date-only"

export type PedidoCategoria = "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES"

export type PedidoCompraStatus =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADO"
  | "EM_COMPRA"
  | "AGUARDANDO_PAGAMENTO"
  | "AGUARDANDO_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO"

export type PedidoCompraItemVM = {
  id?: number
  descricao: string
  quantidade: number
  tamanho?: number | null
  precoUnitario: number
  total: number
  componente?: string | null
}

export type PedidoCompraVM = {
  id?: number
  obraId?: number | null

  categoria: PedidoCategoria
  status: PedidoCompraStatus

  fornecedorId?: number | null
  fornecedorNome?: string | null

  valorOrcado?: number | null
  valorPedido?: number | null
  valorRealizado?: number | null
  frete?: number | null

  descricao?: string | null
  observacoes?: string | null

  dataEntrega?: string | null
  enderecoEntrega?: string | null
  nomeReceptor?: string | null
  telefoneReceptor?: string | null
  linkMaps?: string | null

  itens: PedidoCompraItemVM[]

  viewed?: boolean
  integrado?: boolean
}

export type Mode = "new" | "view" | "edit"

export function formatCurrency(value: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "-"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
}

export function formatDateLong(dateString: string) {
  return formatDateOnlyLongPtBr(dateString)
}

export function formatDateShort(dateString: string) {
  return formatDateOnlyPtBr(dateString)
}

export function sumItensTotal(itens: { total: number }[]) {
  return (itens ?? []).reduce((acc, i) => acc + Number(i?.total || 0), 0)
}

export function getPedidoCompraValorPedido(pedido: {
  valorPedido?: number | string | null
  valor_pedido?: number | string | null
  frete?: number | string | null
  itens?: Array<{ total?: number | string | null }>
}) {
  const explicit = Number(pedido.valorPedido ?? pedido.valor_pedido)
  if (Number.isFinite(explicit) && explicit > 0) return explicit

  const itensTotal = (pedido.itens ?? []).reduce((acc, item) => acc + Number(item?.total ?? 0), 0)
  const frete = Number(pedido.frete ?? 0)

  return itensTotal + (Number.isFinite(frete) ? frete : 0)
}

export function normalizeStatus(s?: string | null): PedidoCompraStatus {
  const raw = String(s ?? "").trim()
  const direct = raw.toUpperCase()

  if (
    direct === "RASCUNHO" ||
    direct === "PENDENTE" ||
    direct === "APROVADO" ||
    direct === "EM_COMPRA" ||
    direct === "AGUARDANDO_PAGAMENTO" ||
    direct === "AGUARDANDO_ENTREGA" ||
    direct === "ENTREGUE" ||
    direct === "CANCELADO"
  ) {
    return direct
  }

  const key = raw
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  const map: Record<string, PedidoCompraStatus> = {
    rascunho: "RASCUNHO",
    pendente: "PENDENTE",
    aprovado: "APROVADO",
    em_compra: "EM_COMPRA",
    emcompra: "EM_COMPRA",
    aguardando_pagamento: "AGUARDANDO_PAGAMENTO",
    aguardando_entrega: "AGUARDANDO_ENTREGA",
    entregue: "ENTREGUE",
    cancelado: "CANCELADO",
  }

  return map[key] ?? "PENDENTE"
}

export function normalizeCategoria(c?: string | null): PedidoCategoria {
  const raw = String(c ?? "").trim()
  const up = raw.toUpperCase()

  if (up === "TELHA" || up === "MADEIRA" || up === "MATERIAIS" || up === "ANDAIMES") return up

  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

  if (key.startsWith("telh")) return "TELHA"
  if (key.startsWith("madeir")) return "MADEIRA"
  if (key.startsWith("mater")) return "MATERIAIS"
  if (key.startsWith("andai")) return "ANDAIMES"

  return "MATERIAIS"
}

export function statusLabel(s: PedidoCompraStatus) {
  const labels: Record<PedidoCompraStatus, string> = {
    RASCUNHO: "Rascunho",
    PENDENTE: "Pendente",
    APROVADO: "Aprovado",
    EM_COMPRA: "Em compra",
    AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
    AGUARDANDO_ENTREGA: "Aguardando entrega",
    ENTREGUE: "Entregue",
    CANCELADO: "Cancelado",
  }
  return labels[s]
}

export function statusBadgeClass(s: PedidoCompraStatus) {
  const colors: Record<PedidoCompraStatus, string> = {
    RASCUNHO: "bg-gray-100 text-gray-800 border-gray-300",
    PENDENTE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    APROVADO: "bg-blue-100 text-blue-800 border-blue-300",
    EM_COMPRA: "bg-purple-100 text-purple-800 border-purple-300",
    AGUARDANDO_PAGAMENTO: "bg-orange-100 text-orange-800 border-orange-300",
    AGUARDANDO_ENTREGA: "bg-cyan-100 text-cyan-800 border-cyan-300",
    ENTREGUE: "bg-green-100 text-green-800 border-green-300",
    CANCELADO: "bg-red-100 text-red-800 border-red-300",
  }
  return colors[s]
}

export function statusColorClass(s: PedidoCompraStatus) {
  const colors: Record<PedidoCompraStatus, string> = {
    RASCUNHO: "bg-gray-500",
    PENDENTE: "bg-orange-500",
    APROVADO: "bg-blue-500",
    EM_COMPRA: "bg-purple-500",
    AGUARDANDO_PAGAMENTO: "bg-red-400",
    AGUARDANDO_ENTREGA: "bg-blue-700",
    ENTREGUE: "bg-green-500",
    CANCELADO: "bg-gray-700",
  }
  return colors[s]
}

export function categoriaLabel(c: PedidoCategoria) {
  const labels: Record<PedidoCategoria, string> = {
    TELHA: "Telha",
    MADEIRA: "Madeira",
    MATERIAIS: "Materiais",
    ANDAIMES: "Andaimes",
  }
  return labels[c]
}
