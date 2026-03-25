import type { FinanceiroContaPagarStatus, PedidoFinanceIntegrationStatus } from "@/types/pedido-compra"

export function isPedidoIntegrated(status: PedidoFinanceIntegrationStatus | null | undefined) {
  return status === "INTEGRADO"
}

export function canIntegratePedido(status: PedidoFinanceIntegrationStatus | null | undefined) {
  return status !== "INTEGRADO"
}

export function canReversePedidoIntegration(status: PedidoFinanceIntegrationStatus | null | undefined) {
  return status === "INTEGRADO"
}

export function getPedidoFinanceLabel(status: PedidoFinanceIntegrationStatus | null | undefined) {
  if (status === "INTEGRADO") return "Integrado"
  if (status === "ESTORNADO") return "Estornado"
  return "Não integrado"
}

export function getPedidoFinanceBadgeClass(status: PedidoFinanceIntegrationStatus | null | undefined) {
  if (status === "INTEGRADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "ESTORNADO") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-[#ece4d6] bg-[#fcfaf6] text-[#9a8f7c]"
}

export function getPayableStatusLabel(status: FinanceiroContaPagarStatus | null | undefined) {
  if (!status) return "Sem conta vinculada"

  const labels: Record<FinanceiroContaPagarStatus, string> = {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    PARCIAL: "Parcial",
    ATRASADO: "Atrasado",
    CANCELADO: "Cancelado",
  }

  return labels[status]
}
