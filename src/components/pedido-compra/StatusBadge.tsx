"use client"

import { Badge } from "@/components/ui/badge"
import { statusConfig, type StatusSlug } from "@/lib/pedido-compra-theme"
import { toSlugStatus } from "@/lib/pedido-compra-utils"
import type { PedidoStatus } from "@/types/pedido-compra"

interface StatusBadgeProps {
  status: StatusSlug | PedidoStatus | string
  variant?: "outline" | "chip"
  className?: string
}

export function StatusBadge({
  status,
  variant = "outline",
  className = "",
}: StatusBadgeProps) {
  const slug = toSlugStatus(status as PedidoStatus)
  const config = statusConfig[slug]
  const baseClass =
    "inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold leading-none tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.38)]"

  if (variant === "chip") {
    return <Badge className={`${baseClass} border-transparent ${config.chipClass} text-white ${className}`}>{config.label}</Badge>
  }

  return (
    <Badge variant="outline" className={`${baseClass} ${config.badgeClass} ${className}`}>
      {config.label}
    </Badge>
  )
}

export function getStatusLabel(status: StatusSlug | PedidoStatus | string): string {
  const slug = toSlugStatus(status as PedidoStatus)
  return statusConfig[slug]?.label ?? status
}

export function getStatusClasses(status: StatusSlug | PedidoStatus | string): string {
  const slug = toSlugStatus(status as PedidoStatus)
  return statusConfig[slug]?.badgeClass ?? ""
}
