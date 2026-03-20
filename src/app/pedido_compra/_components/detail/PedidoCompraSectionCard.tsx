"use client"

import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { listShellClass } from "@/app/pedido_compra/_components/list/styles"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

export function PedidoCompraSectionCard({
  title,
  icon,
  actions,
  className,
  contentClassName,
  children,
}: Props) {
  return (
    <Card className={cn(listShellClass, "px-4 py-4 md:px-5", className)}>
      <div className="mb-4 flex flex-col gap-3 border-b border-[#ece6db] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-[#6f6556]">{icon}</span> : null}
            <h2 className="text-sm font-semibold tracking-[0.01em] text-[#2c201b]">{title}</h2>
          </div>
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </Card>
  )
}
