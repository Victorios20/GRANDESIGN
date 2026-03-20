"use client"

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { FornecedorOption, ObraSearchItem, PurchaseOrderCategoryLabel } from "@/types/pedido-compra"

import {
  listControlClass,
  listGhostTextButtonClass,
  listShellClass,
  listSubtleButtonClass,
  listSubtlePanelClass,
} from "./styles"

type Props = {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  selectedCategory: PurchaseOrderCategoryLabel | "todas"
  onCategoryChange: (value: PurchaseOrderCategoryLabel | "todas") => void
  selectedSupplierId: number | "all"
  onSupplierChange: (value: number | "all") => void
  fornecedores: FornecedorOption[]
  selectedProjectId: number | null
  obraSelected: ObraSearchItem | null
  obraOpen: boolean
  onObraOpenChange: (open: boolean) => void
  obraQuery: string
  onObraQueryChange: (value: string) => void
  obraLoading: boolean
  obraOptions: ObraSearchItem[]
  onSelectObra: (obra: ObraSearchItem) => void
  onClearObra: () => void
  onlyActiveObras: boolean
  onOnlyActiveObrasChange: (value: boolean) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  showAdvancedFilters: boolean
  onShowAdvancedFiltersChange: (value: boolean) => void
  categories: PurchaseOrderCategoryLabel[]
}

function getAdvancedFilterCount(selectedProjectId: number | null, onlyActiveObras: boolean) {
  let count = 0
  if (selectedProjectId != null) count += 1
  if (onlyActiveObras) count += 1
  return count
}

export function PedidoCompraListFilters({
  searchTerm,
  onSearchTermChange,
  selectedCategory,
  onCategoryChange,
  selectedSupplierId,
  onSupplierChange,
  fornecedores,
  selectedProjectId,
  obraSelected,
  obraOpen,
  onObraOpenChange,
  obraQuery,
  onObraQueryChange,
  obraLoading,
  obraOptions,
  onSelectObra,
  onClearObra,
  onlyActiveObras,
  onOnlyActiveObrasChange,
  hasActiveFilters,
  onClearFilters,
  showAdvancedFilters,
  onShowAdvancedFiltersChange,
  categories,
}: Props) {
  const advancedCount = getAdvancedFilterCount(selectedProjectId, onlyActiveObras)

  return (
    <section className={cn(listShellClass, "space-y-3 px-4 py-4 md:px-5")}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7d69]" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Buscar por número, fornecedor, descrição ou obra"
            className={cn("h-10 rounded-lg pl-9 pr-3 text-sm placeholder:text-[#9a8f7c]", listControlClass)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-center">
          <Select value={selectedCategory} onValueChange={(value) => onCategoryChange(value as PurchaseOrderCategoryLabel | "todas")}>
            <SelectTrigger className={cn("min-w-[170px] px-3 text-sm", listControlClass)}>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSupplierId === "all" ? "all" : String(selectedSupplierId)}
            onValueChange={(value) => onSupplierChange(value === "all" ? "all" : Number(value))}
          >
            <SelectTrigger className={cn("min-w-[200px] px-3 text-sm", listControlClass)}>
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os fornecedores</SelectItem>
              {fornecedores.map((fornecedor) => (
                <SelectItem key={fornecedor.id} value={String(fornecedor.id)}>
                  {fornecedor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            onClick={() => onShowAdvancedFiltersChange(!showAdvancedFilters)}
            className={cn(
              "gap-2 px-3 text-sm",
              listSubtleButtonClass,
              showAdvancedFilters && "border-[#c9bea4] bg-[#f2ead8] text-[#2c201b]"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Mais filtros
            {advancedCount > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-4 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  showAdvancedFilters ? "bg-white text-[#2c201b]" : "bg-[#ebe4d4] text-[#6f6556]"
                )}
              >
                {advancedCount}
              </span>
            ) : null}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvancedFilters && "rotate-180")} />
          </Button>

          {hasActiveFilters ? (
            <Button type="button" variant="ghost" onClick={onClearFilters} className={cn("px-3 text-sm", listGhostTextButtonClass)}>
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {showAdvancedFilters ? (
        <div className={cn(listSubtlePanelClass, "grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end")}>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]">Obra</Label>
            <Popover open={obraOpen} onOpenChange={onObraOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-between px-3 text-sm font-normal hover:bg-white", listControlClass)}
                >
                  <span className="truncate">
                    {obraSelected
                      ? `Obra #${obraSelected.id}${obraSelected.titulo ? ` - ${obraSelected.titulo}` : ""}`
                      : "Selecionar obra"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#8a7d69]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border-[#ddd7cc] p-0" align="start">
                <Command shouldFilter={false}>
                  <div className="border-b border-[#efe8db] p-2">
                    <CommandInput
                      value={obraQuery}
                      onValueChange={onObraQueryChange}
                      placeholder="Digite o ID ou o título da obra..."
                    />
                  </div>
                  <CommandList>
                    {obraLoading ? <div className="p-3 text-sm text-[#7b705f]">Buscando...</div> : null}
                    {!obraLoading ? (
                      <>
                        <CommandEmpty>Nenhuma obra encontrada</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="all" onSelect={onClearObra}>
                            Todas as obras
                          </CommandItem>
                          {obraOptions.map((obra) => (
                            <CommandItem key={obra.id} value={String(obra.id)} onSelect={() => onSelectObra(obra)}>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-[#2c201b]">
                                  Obra #{obra.id}
                                  {obra.titulo ? ` - ${obra.titulo}` : ""}
                                </div>
                                <div className="truncate text-xs text-[#7b705f]">
                                  {(obra.nomeReceptor ?? "").trim() || "Sem dados do cliente"}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    ) : null}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e0d9cc] bg-white px-3 py-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-[#2c201b]">Apenas obras ativas</p>
              <p className="text-xs text-[#7b705f]">Oculta obras finalizadas.</p>
            </div>
            <Switch checked={onlyActiveObras} onCheckedChange={onOnlyActiveObrasChange} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
