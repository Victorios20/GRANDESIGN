"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { statusConfig } from "@/lib/pedido-compra-theme"
import type { PurchaseOrderStatusSlug } from "@/types/pedido-compra"

type StatusCounts = {
  todos: number
  rascunho: number
  aprovado: number
  "em-compra": number
  "aguardando-pagamento": number
  "aguardando-entrega": number
  entregue: number
}

type Props = {
  value: PurchaseOrderStatusSlug
  onValueChange: (value: PurchaseOrderStatusSlug) => void
  counts: StatusCounts
}

const items: Array<{ value: PurchaseOrderStatusSlug; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "aprovado", label: "Aprovado" },
  { value: "em-compra", label: "Em compra" },
  { value: "aguardando-pagamento", label: statusConfig["aguardando-pagamento"].shortLabel ?? "Pagto pend." },
  { value: "aguardando-entrega", label: statusConfig["aguardando-entrega"].shortLabel ?? "Entrega pend." },
  { value: "entregue", label: "Entregue" },
]

export function PedidoCompraStatusTabs({ value, onValueChange, counts }: Props) {
  return (
    <section>
      <Tabs value={value} onValueChange={(nextValue) => onValueChange(nextValue as PurchaseOrderStatusSlug)} className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-none bg-transparent p-0">
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="group h-9 flex-none rounded-lg border border-[#ddd7cc] bg-white px-3 text-[#5b5347] shadow-none transition-colors hover:border-[#d4cbb9] hover:bg-[#f7f4ec] data-[state=active]:border-[#c9bea4] data-[state=active]:bg-[#faf3e0] data-[state=active]:text-[#2c201b]"
            >
              <span>{item.label}</span>
              <span className="rounded-md bg-[#f1ece2] px-1.5 py-0.5 text-[10px] font-semibold text-[#6f6556] transition-colors group-data-[state=active]:bg-[#393316] group-data-[state=active]:text-[#faf3e0]">
                {counts[item.value as keyof StatusCounts] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </section>
  )
}
