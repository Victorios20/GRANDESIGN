"use client"

import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { listShellClass } from "@/app/pedido_compra/_components/list/styles"
import { cn } from "@/lib/utils"

type SummaryItem = {
  label: string
  value: ReactNode
}

type Props = {
  title: string
  meta?: ReactNode
  status?: ReactNode
  actions?: ReactNode
  summaryItems?: SummaryItem[]
  className?: string
}

export function PedidoCompraDetailHeader({
  title,
  meta,
  status,
  actions,
  summaryItems = [],
  className,
}: Props) {
  return (
    <Card className={cn(listShellClass, "px-4 py-4 md:px-5", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Pedido de compra
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[0.01em] text-[#2c201b] md:text-[1.35rem]">
            {title}
          </h1>
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">{meta}</div> : null}
        </div>

        {(status || actions) ? (
          <div className="flex w-full flex-wrap items-center gap-2 self-start sm:w-auto sm:flex-nowrap lg:justify-end">
            {status ? <div className="shrink-0">{status}</div> : null}
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
      </div>

      {summaryItems.length > 0 ? (
        <div className="mt-4 grid gap-x-6 gap-y-3 border-t border-[#ece6db] pt-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {item.label}
              </p>
              <div className="mt-1 text-sm font-medium text-[#2c201b]">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
