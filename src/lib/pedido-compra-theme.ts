/**
 * Pedido de Compra - Design Tokens & Theme Configuration
 * 
 * Centralized theme configuration based on official palette.
 * Import this file instead of duplicating status/color configs.
 */

// ═══════════════════════════════════════════════════════════
// OFFICIAL COLOR PALETTE
// ═══════════════════════════════════════════════════════════

export const palette = {
    primary: "#2c201b",      // Marrom escuro - primary actions
    secondary: "#393316",    // Verde oliva - secondary actions
    accent: "#f5d193",       // Dourado/Areia - highlights
    background: "#FAF3E0",   // Creme - backgrounds
} as const

// ═══════════════════════════════════════════════════════════
// STATUS CONFIGURATION (replaces 6 duplicated statusConfig objects)
// ═══════════════════════════════════════════════════════════

export type StatusSlug =
    | "rascunho"
    | "pendente"
    | "aprovado"
    | "em-compra"
    | "aguardando-pagamento"
    | "aguardando-entrega"
    | "entregue"
    | "cancelado"

export type StatusConfig = {
    label: string
    bg: string
    text: string
    border: string
    /** Combined class for Badge component */
    badgeClass: string
    /** Solid background for chips/pills */
    chipClass: string
}

export const statusConfig: Record<StatusSlug, StatusConfig> = {
    rascunho: {
        label: "Rascunho",
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-300",
        badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
        chipClass: "bg-gray-500",
    },
    pendente: {
        label: "Pendente",
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-300",
        badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
        chipClass: "bg-yellow-500",
    },
    aprovado: {
        label: "Aprovado",
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-300",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
        chipClass: "bg-blue-500",
    },
    "em-compra": {
        label: "Em Compra",
        bg: "bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-300",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
        chipClass: "bg-amber-500",
    },
    "aguardando-pagamento": {
        label: "Aguardando Pagamento",
        bg: "bg-orange-100",
        text: "text-orange-800",
        border: "border-orange-300",
        badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
        chipClass: "bg-orange-500",
    },
    "aguardando-entrega": {
        label: "Aguardando Entrega",
        bg: "bg-cyan-100",
        text: "text-cyan-800",
        border: "border-cyan-300",
        badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-300",
        chipClass: "bg-cyan-500",
    },
    entregue: {
        label: "Entregue",
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-300",
        badgeClass: "bg-green-100 text-green-800 border-green-300",
        chipClass: "bg-green-500",
    },
    cancelado: {
        label: "Cancelado",
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        badgeClass: "bg-red-100 text-red-800 border-red-300",
        chipClass: "bg-red-500",
    },
}

// ═══════════════════════════════════════════════════════════
// STATUS LIST (for iterations)
// ═══════════════════════════════════════════════════════════

export const statusList: StatusSlug[] = [
    "rascunho",
    "aprovado",
    "em-compra",
    "aguardando-pagamento",
    "aguardando-entrega",
    "entregue",
]

export const editableStatusList: StatusSlug[] = [
    "rascunho",
    "pendente",
    "aprovado",
    "em-compra",
    "aguardando-pagamento",
    "aguardando-entrega",
    "entregue",
    "cancelado",
]

// ═══════════════════════════════════════════════════════════
// CATEGORY CONFIGURATION
// ═══════════════════════════════════════════════════════════

export type CategorySlug = "TELHA" | "MADEIRA" | "MATERIAIS" | "ANDAIMES" | "ANDAIME"

export const categoryLabels: Record<CategorySlug, string> = {
    TELHA: "Telha",
    MADEIRA: "Madeira",
    MATERIAIS: "Materiais",
    ANDAIMES: "Andaimes",
    ANDAIME: "Andaime",
}
