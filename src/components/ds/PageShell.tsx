/**
 * GRANDESIGN Design System — PageShell
 *
 * Wrapper padrão de página operacional.
 * Inclui: título, contagem, descrição opcional e slot para ações.
 *
 * Deve ser usado em TODA tela operacional para garantir
 * consistência de hierarquia visual.
 */

import React from "react"
import { cn } from "@/lib/utils"

// ── Props ──────────────────────────────────────────────────────────────────────

interface PageShellProps {
  /** Título da página (h1) — obrigatório para SEO */
  title: string
  /** Contagem de registros (aparece ao lado do título em badge) */
  count?: number
  /** Subtítulo/descrição opcional */
  description?: string
  /** Slot de ações — botões aparecem alinhados à direita do cabeçalho */
  actions?: React.ReactNode
  /** Slot de filtros/toolbar — aparece abaixo do cabeçalho */
  toolbar?: React.ReactNode
  /** Conteúdo principal */
  children: React.ReactNode
  className?: string
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function PageShell({
  title,
  count,
  description,
  actions,
  toolbar,
  children,
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        // Page background do Operational List Recipe
        "min-h-full p-4 md:p-6",
        className
      )}
    >
      {/* ── Cabeçalho da página ──────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[#393316] md:text-2xl">
              {title}
            </h1>
            {count !== undefined && (
              <span className="inline-flex h-6 items-center rounded-md border border-[#ddd7cc] bg-[#f6f4ef] px-2 text-[11px] font-medium text-[#5f584c]">
                {count}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-[#6f6556]">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* ── Toolbar / Filtros ───────────────────────────────────────────── */}
      {toolbar && (
        <div className="mb-4">
          {toolbar}
        </div>
      )}

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      {children}
    </div>
  )
}

// ── Shell de card operacional ────────────────────────────────────────────────

/**
 * Wrapper para o shell visual principal (card branco com borda e sombra sutil).
 * Use para envolver DataTable e conteúdo operacional.
 */
interface OperationalShellProps {
  children: React.ReactNode
  className?: string
}

export function OperationalShell({ children, className }: OperationalShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#e8e1d6] bg-white",
        "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      {children}
    </div>
  )
}
