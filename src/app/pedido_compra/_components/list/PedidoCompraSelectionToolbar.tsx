"use client"

import type { CheckedState } from "@radix-ui/react-checkbox"
import { FileDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import { listGhostTextButtonClass, listMutedButtonClass, listSelectionToolbarClass } from "./styles"

type Props = {
  selectedCount: number
  visibleSelectionState: CheckedState
  onToggleVisibleSelection: (checked: boolean) => void
  onClearSelection: () => void
  onOpenBulkStatus: () => void
  onExport: () => void
  onOpenBulkDelete: () => void
}

export function PedidoCompraSelectionToolbar({
  selectedCount,
  visibleSelectionState,
  onToggleVisibleSelection,
  onClearSelection,
  onOpenBulkStatus,
  onExport,
  onOpenBulkDelete,
}: Props) {
  return (
    <section className={cn(listSelectionToolbarClass, "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={visibleSelectionState}
            onCheckedChange={(checked) => onToggleVisibleSelection(Boolean(checked))}
            aria-label="Selecionar pedidos visíveis"
            className="h-4 w-4 rounded border-[#b8aa89] data-[state=checked]:!border-[#393316] data-[state=checked]:!bg-[#393316] data-[state=checked]:text-[#faf3e0]"
          />
          <span className="text-sm font-semibold text-[#2c201b]">
            {selectedCount} pedido{selectedCount === 1 ? "" : "s"} selecionado{selectedCount === 1 ? "" : "s"}
          </span>
        </div>

        <Button type="button" variant="ghost" onClick={onClearSelection} className={cn("px-3 text-sm", listGhostTextButtonClass)}>
          Limpar seleção
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenBulkStatus}
          className={cn("gap-2 px-3 text-sm", listMutedButtonClass)}
        >
          Alterar status
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onExport}
          className={cn("gap-2 px-3 text-sm", listMutedButtonClass)}
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenBulkDelete}
          className="h-9 rounded-lg border-[#dcc6c1] bg-transparent px-3 text-sm text-[#8f5d51] hover:bg-[#f7efed] hover:text-[#7d4237]"
        >
          Excluir
        </Button>
      </div>
    </section>
  )
}
