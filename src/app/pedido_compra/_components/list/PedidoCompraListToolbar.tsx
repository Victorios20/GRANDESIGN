"use client"

import { ArrowDown, ArrowUp, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { listControlClass, listMutedButtonClass, listToolbarClass } from "./styles"

type SortBy = "date" | "number" | "description" | "category" | "value" | "delivery" | "status" | "integration"

type ActiveFilterChip = {
  key: string
  label: string
}

type Props = {
  resultCount: number
  activeFilterChips: ActiveFilterChip[]
  onRemoveFilterChip: (key: string) => void
  sortBy: SortBy
  onSortByChange: (value: SortBy) => void
  sortOrder: "asc" | "desc"
  onToggleSortOrder: () => void
}

export function PedidoCompraListToolbar({
  resultCount,
  activeFilterChips,
  onRemoveFilterChip,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
}: Props) {
  return (
    <section className={cn(listToolbarClass, "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between")}>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-[#2c201b]">{resultCount} pedidos</span>
          <span className="text-sm text-[#7b705f]">na listagem atual</span>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="outline"
                className="h-6 rounded-md border-[#ddd7cc] bg-[#f6f4ef] px-2 text-[11px] font-medium text-[#5f584c]"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => onRemoveFilterChip(chip.key)}
                  className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm text-[#8a7d69] transition-colors hover:bg-black/5 hover:text-[#2c201b]"
                  aria-label={`Remover filtro ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-[#6f6556]">
          <span className="font-medium text-[#2c201b]">Ordenar por</span>
          <Select value={sortBy} onValueChange={(value) => onSortByChange(value as SortBy)}>
            <SelectTrigger className={cn("min-w-[170px] px-3 text-sm", listControlClass)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Data de criação</SelectItem>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="description">Descrição</SelectItem>
              <SelectItem value="category">Categoria</SelectItem>
              <SelectItem value="value">Valor do pedido</SelectItem>
              <SelectItem value="delivery">Entrega</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="integration">Integração</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onToggleSortOrder}
          className={cn("gap-2 px-3 text-sm", listMutedButtonClass)}
        >
          {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          {sortOrder === "asc" ? "Crescente" : "Decrescente"}
        </Button>
      </div>
    </section>
  )
}
