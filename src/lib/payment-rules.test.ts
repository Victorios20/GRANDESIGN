import { expect, test } from "vitest"
import { resolvePaymentOutcome, shouldAdvancePedidoToAwaitingDelivery } from "@/lib/payment-rules"

test("pagamento integral: PAGO, sem alterar total", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 0, amortized: 1000, quitarSaldo: false })
  expect(r.isPaid).toBe(true)
  expect(r.newValorTotal).toBeNull()
})

test("pagamento parcial sem quitar: PARCIAL, sem alterar total", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 0, amortized: 700, quitarSaldo: false })
  expect(r.isPaid).toBe(false)
  expect(r.newValorTotal).toBeNull()
})

test("pagamento parcial com quitarSaldo: reduz total para o valor pago e vira PAGO", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 0, amortized: 700, quitarSaldo: true })
  expect(r.isPaid).toBe(true)
  expect(r.newValorTotal).toBe(700)
})

test("quitarSaldo considera pagamentos anteriores", () => {
  const r = resolvePaymentOutcome({ total: 1000, paid: 200, amortized: 300, quitarSaldo: true })
  expect(r.isPaid).toBe(true)
  expect(r.newValorTotal).toBe(500)
})

test("avança pedido em fase pré-entrega quando conta vira PARCIAL", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("AGUARDANDO_PAGAMENTO", "PARCIAL")).toBe(true)
})

test("avança pedido quando conta vira PAGO", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("EM_COMPRA", "PAGO")).toBe(true)
})

test("não regride pedido já em AGUARDANDO_ENTREGA", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("AGUARDANDO_ENTREGA", "PAGO")).toBe(false)
})

test("não mexe em pedido ENTREGUE ou CANCELADO", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("ENTREGUE", "PAGO")).toBe(false)
  expect(shouldAdvancePedidoToAwaitingDelivery("CANCELADO", "PAGO")).toBe(false)
})

test("não avança quando conta não foi paga (ex: PENDENTE)", () => {
  expect(shouldAdvancePedidoToAwaitingDelivery("AGUARDANDO_PAGAMENTO", "PENDENTE")).toBe(false)
})
