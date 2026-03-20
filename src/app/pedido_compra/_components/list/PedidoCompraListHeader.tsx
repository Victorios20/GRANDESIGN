"use client"

import { LayoutGrid, LayoutList, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { listPrimaryButtonClass, purchaseOrderListPalette } from "./styles"

type Props = {
  resultCount: number
  viewMode: "list" | "kanban"
  onViewModeChange: (mode: "list" | "kanban") => void
  onCreatePedido: () => void
}

export function PedidoCompraListHeader({ resultCount, viewMode, onViewModeChange, onCreatePedido }: Props) {
  return (
    <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">Pedidos de Compra</h1>
        <p className="text-sm text-[#6f6556]">
          {resultCount} pedido{resultCount === 1 ? "" : "s"} na visualização atual
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className="inline-flex w-fit items-center rounded-lg border p-0.5"
          style={{
            borderColor: `${purchaseOrderListPalette.primary}1f`,
            backgroundColor: "#ebefe8",
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("list")}
            className={cn(
              "h-9 rounded-md px-3 text-sm font-medium shadow-none",
              viewMode === "list"
                ? "bg-white text-[#2c201b] shadow-sm hover:bg-white"
                : "text-[#5f655a] hover:bg-white/70 hover:text-[#2c201b]"
            )}
          >
            <LayoutList className="h-4 w-4" />
            Lista
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("kanban")}
            className={cn(
              "h-9 rounded-md px-3 text-sm font-medium shadow-none",
              viewMode === "kanban"
                ? "bg-white text-[#2c201b] shadow-sm hover:bg-white"
                : "text-[#5f655a] hover:bg-white/70 hover:text-[#2c201b]"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
        </div>

        <Button type="button" onClick={onCreatePedido} className={cn("h-10 rounded-lg px-4 text-sm", listPrimaryButtonClass)}>
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>
      </div>
    </section>
  )
}
