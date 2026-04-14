/**
 * GRANDESIGN Design System — FilterToolbar
 *
 * Barra de filtros padronizada para telas operacionais.
 * Implementa o recipe "Toolbar / filtros" do brand.md seção 11.
 *
 * Suporta:
 * - Input de busca (slot)
 * - Filtros customizados (slot)
 * - Chips de filtros ativos (com remoção individual)
 * - Botão "Limpar filtros"
 */

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type ActiveFilter = {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface FilterToolbarProps {
  /** Slot de busca (ex: <Input type="search" />) */
  search?: React.ReactNode
  /** Slots de filtros (ex: <Select />, botões de período, etc.) */
  filters?: React.ReactNode
  /** Ações extras no lado direito (ex: botão Exportar) */
  actions?: React.ReactNode
  /** Filtros ativos exibidos como chips removíveis */
  activeFilters?: ActiveFilter[]
  /** Callback para limpar todos os filtros */
  onClearAll?: () => void
  className?: string
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function FilterToolbar({
  search,
  filters,
  actions,
  activeFilters = [],
  onClearAll,
  className,
}: FilterToolbarProps) {
  const hasActiveFilters = activeFilters.length > 0

  return (
    <div
      className={cn(
        "rounded-xl border border-[#e8e1d6] bg-white",
        "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        "px-4 py-3",
        "flex flex-col gap-3",
        className
      )}
    >
      {/* ── Linha principal: busca + filtros + ações ─────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Busca */}
        {search && (
          <div className="flex-1">
            {search}
          </div>
        )}

        {/* Filtros */}
        {filters && (
          <div className="flex flex-wrap items-center gap-2">
            {filters}
          </div>
        )}

        {/* Ações à direita */}
        {(actions || hasActiveFilters && onClearAll) && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {hasActiveFilters && onClearAll && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg px-3 text-sm text-[#6f6556] hover:bg-[#f3efe6] hover:text-[#2c201b]"
                onClick={onClearAll}
              >
                Limpar filtros
              </Button>
            )}
            {actions}
          </div>
        )}
      </div>

      {/* ── Linha de chips de filtros ativos ─────────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => (
            <ActiveFilterChip key={filter.key} filter={filter} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chip de filtro ativo ──────────────────────────────────────────────────────

function ActiveFilterChip({ filter }: { filter: ActiveFilter }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#ddd7cc] bg-[#f6f4ef] py-0.5 pl-2 pr-1 text-[11px] font-medium text-[#5f584c]">
      <span className="text-[#9a8f7c]">{filter.label}:</span>
      {filter.value}
      <button
        type="button"
        onClick={filter.onRemove}
        className="ml-0.5 rounded hover:text-[#2c201b] transition-colors"
        aria-label={`Remover filtro ${filter.label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
