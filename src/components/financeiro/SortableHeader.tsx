"use client"

import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { operationalListTableHeadCellClass } from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc"

type SortableHeaderProps<TColumn extends string> = {
  column: TColumn
  activeColumn: TColumn
  direction: SortDirection
  onSort: (column: TColumn) => void
  children: ReactNode
  align?: "left" | "right"
  className?: string
}

export function SortableHeader<TColumn extends string>({
  column,
  activeColumn,
  direction,
  onSort,
  children,
  align = "left",
  className,
}: SortableHeaderProps<TColumn>) {
  const active = column === activeColumn
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown

  return (
    <th
      className={cn(operationalListTableHeadCellClass, align === "right" && "text-right", className)}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md text-left transition-colors hover:text-[#2c201b]",
          align === "right" && "ml-auto"
        )}
      >
        <span>{children}</span>
        <Icon className={cn("size-3.5", active ? "text-[#393316]" : "text-[#a19686]")} />
      </button>
    </th>
  )
}
