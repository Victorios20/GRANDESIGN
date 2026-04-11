/**
 * GRANDESIGN Design System — DataTable
 *
 * Tabela padronizada baseada no shadcn <Table>.
 * Implementa o recipe "Operational List" do brand.md seção 11.
 *
 * Substitui o padrão MUIDataTable do módulo de Orçamentos (legado)
 * e garante consistência com Contas a Pagar / Pedidos de Compra.
 */

import React from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type DataTableColumn<TRow> = {
  key: string
  label: string
  /** Renderizador customizado. Recebe a linha e retorna ReactNode */
  render?: (row: TRow, index: number) => React.ReactNode
  /** Alinhamento da coluna */
  align?: "left" | "center" | "right"
  /** Largura fixa (ex: "w-12", "w-40") */
  width?: string
  /** Ocultar em mobile */
  hiddenOnMobile?: boolean
}

export type DataTablePagination = {
  page: number           // 1-indexed
  perPage: number
  total: number
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
}

interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow) => string | number
  /** Clique em linha — se omitido, linhas não são clicáveis */
  onRowClick?: (row: TRow) => void
  loading?: boolean
  /** Número de linhas skeleton durante loading */
  skeletonRows?: number
  pagination?: DataTablePagination
  /** Estado vazio customizado */
  emptyState?: React.ReactNode
  className?: string
}

// ── Estilos derivados do Operational List Recipe (brand.md) ───────────────────

const styles = {
  tableHeadRow:  "border-b border-[#e7e0d4] hover:bg-transparent",
  tableHeadCell: "bg-[#faf8f3] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b705f]",
  tableRow:      "border-b border-[#efe8dc] bg-white transition-colors hover:bg-[#faf8f4]",
  tableRowLink:  "cursor-pointer",
  tableCell:     "px-4 py-3.5 text-sm text-[#2c201b]",
  paginationBtn: "h-8 rounded-lg border border-[#ddd7cc] bg-white px-3 text-[#2c201b] hover:bg-[#f7f4ec] disabled:opacity-40 disabled:pointer-events-none",
  paginationActivePage: "h-8 min-w-8 rounded-lg bg-[#393316] px-2 text-[#faf3e0] text-sm font-medium",
  paginationPage:       "h-8 min-w-8 rounded-lg px-2 text-[#6f6556] text-sm hover:bg-[#f3efe6] hover:text-[#2c201b]",
} as const

// ── Componente ─────────────────────────────────────────────────────────────────

export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  skeletonRows = 5,
  pagination,
  emptyState,
  className,
}: DataTableProps<TRow>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.perPage) : 1
  const currentPage = pagination?.page ?? 1

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {/* Tabela */}
      <div className="overflow-x-auto rounded-t-xl border border-[#e8e1d6]">
        <Table>
          <TableHeader>
            <TableRow className={styles.tableHeadRow}>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    styles.tableHeadCell,
                    col.align === "right"  && "text-right",
                    col.align === "center" && "text-center",
                    col.width,
                    col.hiddenOnMobile && "hidden sm:table-cell"
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <>
                {Array.from({ length: skeletonRows }).map((_, i) => (
                  <TableRow key={i} className={styles.tableRow}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={styles.tableCell}>
                        <Skeleton className="h-4 w-full max-w-[180px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-16 text-center text-sm text-[#7b705f]"
                >
                  {emptyState ?? "Nenhum resultado encontrado."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(
                    styles.tableRow,
                    onRowClick && styles.tableRowLink,
                    // Accent bar lateral no hover (via pseudo-element não disponível em Tailwind
                    // — implementado via box-shadow inline para consistência com módulos existentes)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        styles.tableCell,
                        col.align === "right"  && "text-right",
                        col.align === "center" && "text-center",
                        col.hiddenOnMobile && "hidden sm:table-cell"
                      )}
                    >
                      {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {pagination && (
        <div className="flex items-center justify-between rounded-b-xl border border-t-0 border-[#e8e1d6] bg-white px-4 py-3">
          <p className="text-sm text-[#7b705f]">
            {pagination.total === 0
              ? "Nenhum resultado"
              : `${((currentPage - 1) * pagination.perPage) + 1}–${Math.min(currentPage * pagination.perPage, pagination.total)} de ${pagination.total}`}
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className={styles.paginationBtn}
              disabled={currentPage <= 1}
              onClick={() => pagination.onPageChange(currentPage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {buildPageNumbers(currentPage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-[#7b705f]">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(Number(p))}
                  className={cn(
                    p === currentPage ? styles.paginationActivePage : styles.paginationPage
                  )}
                  aria-current={p === currentPage ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              className={styles.paginationBtn}
              disabled={currentPage >= totalPages}
              onClick={() => pagination.onPageChange(currentPage + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "…")[] = [1]

  if (current > 3)       pages.push("…")
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push("…")

  pages.push(total)
  return pages
}
