"use client"

import type { ReactNode } from "react"

import { operationalListToolbarClass } from "@/components/ui/operational-list-styles"
import { cn } from "@/lib/utils"

type ListSummaryBarProps = {
  countLabel: string
  totalLabel?: string
  selectedCountLabel?: string
  selectedTotalLabel?: string
  actions?: ReactNode
  className?: string
}

export function ListSummaryBar({
  countLabel,
  totalLabel,
  selectedCountLabel,
  selectedTotalLabel,
  actions,
  className,
}: ListSummaryBarProps) {
  const hasSelection = Boolean(selectedCountLabel || selectedTotalLabel)

  return (
    <section className={cn(operationalListToolbarClass, "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm font-medium text-[#2c201b]">{countLabel}</span>
        {totalLabel ? <span className="text-sm font-semibold text-[#2c201b]">{totalLabel}</span> : null}
        {hasSelection ? (
          <>
            {selectedCountLabel ? <span className="text-sm text-[#6f6556]">{selectedCountLabel}</span> : null}
            {selectedTotalLabel ? <span className="text-sm font-semibold text-[#2c201b]">{selectedTotalLabel}</span> : null}
          </>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  )
}
