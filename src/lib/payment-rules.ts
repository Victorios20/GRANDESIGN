export function resolvePaymentOutcome(args: {
  total: number
  paid: number
  amortized: number
  quitarSaldo: boolean
}): { newValorTotal: number | null; isPaid: boolean } {
  const { total, paid, amortized, quitarSaldo } = args
  const newPaid = paid + amortized
  const wouldLeaveBalance = total - newPaid > 0.01

  if (quitarSaldo && wouldLeaveBalance) {
    // Reduz o total para o quanto foi efetivamente pago → conta fica quitada.
    return { newValorTotal: Number(newPaid.toFixed(2)), isPaid: true }
  }

  const isPaid = Math.abs(total - newPaid) < 0.01
  return { newValorTotal: null, isPaid }
}

// A partir destes statuses o pedido pode avançar para AGUARDANDO_ENTREGA.
export const PEDIDO_PRE_ENTREGA_STATUSES = [
  "PENDENTE",
  "APROVADO",
  "EM_COMPRA",
  "AGUARDANDO_PAGAMENTO",
] as const

const CONTA_PAGA_STATUSES = ["PAGO", "PARCIAL"]

export function shouldAdvancePedidoToAwaitingDelivery(
  currentPedidoStatus: string,
  newContaStatus: string,
): boolean {
  if (!CONTA_PAGA_STATUSES.includes(newContaStatus)) return false
  return (PEDIDO_PRE_ENTREGA_STATUSES as readonly string[]).includes(currentPedidoStatus)
}
