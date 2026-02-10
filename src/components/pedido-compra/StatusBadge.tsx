"use client"

import { Badge } from "@/components/ui/badge"
import { statusConfig, type StatusSlug } from "@/lib/pedido-compra-theme"
import { toSlugStatus } from "@/lib/pedido-compra-utils"
import type { PedidoStatus } from "@/types/pedido-compra"

// ═══════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════

interface StatusBadgeProps {
    /** Status can be either slug format or DB format */
    status: StatusSlug | PedidoStatus | string
    /** Use solid chip style instead of outline */
    variant?: "outline" | "chip"
    /** Additional classes */
    className?: string
}

/**
 * Reusable status badge component for purchase orders.
 * Handles both slug format (em-compra) and DB format (EM_COMPRA).
 * 
 * @example
 * <StatusBadge status="em-compra" />
 * <StatusBadge status="EM_COMPRA" variant="chip" />
 */
export function StatusBadge({
    status,
    variant = "outline",
    className = ""
}: StatusBadgeProps) {
    // Normalize status to slug format
    const slug = toSlugStatus(status as PedidoStatus)
    const config = statusConfig[slug]

    if (variant === "chip") {
        return (
            <Badge className={`${config.chipClass} text-white ${className}`}>
                {config.label}
            </Badge>
        )
    }

    return (
        <Badge variant="outline" className={`${config.badgeClass} ${className}`}>
            {config.label}
        </Badge>
    )
}

// ═══════════════════════════════════════════════════════════
// STATUS LABEL (text only)
// ═══════════════════════════════════════════════════════════

export function getStatusLabel(status: StatusSlug | PedidoStatus | string): string {
    const slug = toSlugStatus(status as PedidoStatus)
    return statusConfig[slug]?.label ?? status
}

export function getStatusClasses(status: StatusSlug | PedidoStatus | string): string {
    const slug = toSlugStatus(status as PedidoStatus)
    return statusConfig[slug]?.badgeClass ?? ""
}
