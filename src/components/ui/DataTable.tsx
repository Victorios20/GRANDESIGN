"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown, Columns, Download, Printer, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type Query = {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDir?: "asc" | "desc"
  search?: string
}

type Props<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  total: number
  page: number
  pageSize: number
  search: string
  onQueryChange: (q: Query) => void
  orderBy?: string
  orderDir?: "asc" | "desc"
  getRowId?: (row: TData) => string | number
  className?: string
  storageKey?: string // para lembrar visibilidade das colunas
  headerBg?: string   // cor do cabeçalho (ex: "#E8C99A")
  headerText?: string // cor do texto (ex: "#8B5E3C")
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  total,
  page,
  pageSize,
  search,
  onQueryChange,
  orderBy,
  orderDir,
  getRowId,
  className,
  storageKey = "dt:cols:orcamentos",
  headerBg = "#E8C99A",
  headerText = "#8B5E3C",
}: Props<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
  const [localSearch, setLocalSearch] = React.useState(search ?? "")

  // Sincroniza estado de ordenação vindo de fora (server state)
  React.useEffect(() => {
    if (orderBy) {
      setSorting([{ id: orderBy, desc: orderDir === "desc" }])
    } else {
      setSorting([])
    }
  }, [orderBy, orderDir])

  // Persiste visibilidade das colunas
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setColumnVisibility(JSON.parse(raw) as VisibilityState)
    } catch {}
  }, [storageKey])

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility))
    } catch {}
  }, [columnVisibility, storageKey])

  // Debounce do search
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search) onQueryChange({ search: localSearch, page: 1 })
    }, 450)
    return () => clearTimeout(t)
  }, [localSearch])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      setSorting(next)
      // Consideramos apenas a primeira coluna da ordenação (single sort)
      const s = next?.[0]
      if (s) onQueryChange({ orderBy: s.id, orderDir: s.desc ? "desc" : "asc", page: 1 })
      else onQueryChange({ orderBy: undefined, orderDir: undefined, page: 1 })
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, idx) => (getRowId ? String(getRowId(row)) : String((row as any)?.id ?? idx)),
  })

  const pageCount = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 1)))

  function exportCSV() {
    const visibleCols = table.getAllLeafColumns().filter((c) => c.getIsVisible())
    const headers = visibleCols.map((c) => c.columnDef.header as string)
    const rows = data.map((row) =>
      visibleCols.map((c) => {
        const id = c.id
        const v = (row as any)?.[id]
        const str = v == null || v === "" ? "-" : String(v)
        // escapa aspas
        return `"${str.replace(/"/g, '""')}"`
      })
    )
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tabela.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function printTable() {
    window.print()
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--marrom,var(--marrom,#8B5E3C)]" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>

        <Button variant="outline" onClick={exportCSV} title="Baixar CSV">
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
        <Button variant="outline" onClick={printTable} title="Imprimir">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" title="Colunas">
              <Columns className="mr-2 h-4 w-4" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {table.getAllLeafColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(v) => column.toggleVisibility(!!v)}
              >
                {String(column.columnDef.header ?? column.id)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader style={{ backgroundColor: headerBg, color: headerText }}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} style={{ backgroundColor: headerBg }}>
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort()
                  const sorted = h.column.getIsSorted() // false | "asc" | "desc"
                  return (
                    <TableHead key={h.id} className="font-semibold text-[--marrom,var(--marrom,#8B5E3C)]">
                      {h.isPlaceholder ? null : (
                        <button
                          className={cn(
                            "inline-flex items-center gap-1 hover:opacity-90",
                            canSort ? "cursor-pointer select-none" : "cursor-default"
                          )}
                          onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {canSort ? (
                            sorted === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                            )
                          ) : null}
                        </button>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-[--marrom,var(--marrom,#8B5E3C)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[--marrom,var(--marrom,#8B5E3C)]">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Página <span className="font-medium">{page + 1}</span> de{" "}
          <span className="font-medium">{pageCount}</span> • Total:{" "}
          <span className="font-medium">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border px-2"
            value={pageSize}
            onChange={(e) => onQueryChange({ pageSize: Number(e.target.value), page: 1 })}
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / página
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => onQueryChange({ page: page })}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= pageCount}
            onClick={() => onQueryChange({ page: page + 2 })}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
