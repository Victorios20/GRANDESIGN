/**
 * Pedido de Compra - Utility Functions
 * 
 * Centralized formatters and helpers.
 * Import from here instead of duplicating in each component.
 */

import type {
    PedidoStatus,
    PurchaseOrderStatusSlug,
    PedidoCategoria,
    PurchaseOrderCategoryLabel
} from "@/types/pedido-compra"
import type { StatusSlug } from "./pedido-compra-theme"
import { formatDateOnlyLongPtBr, formatDateOnlyPtBr } from "./date-only"

// ═══════════════════════════════════════════════════════════
// MONEY FORMATTING
// ═══════════════════════════════════════════════════════════

export function formatMoney(value: number | string | null | undefined): string {
    const n = Number(String(value ?? "").replace(",", "."))
    if (!Number.isFinite(n)) return "-"
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatMoneyCompact(value: number | string | null | undefined): string {
    const n = Number(String(value ?? "").replace(",", "."))
    if (!Number.isFinite(n)) return "-"
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ═══════════════════════════════════════════════════════════
// DATE FORMATTING
// ═══════════════════════════════════════════════════════════

export function formatDateBR(input: string | Date | null | undefined): string {
    if (!input) return "-"
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}(?:$|T|\s)/.test(input.trim())) {
        return formatDateOnlyPtBr(input)
    }
    const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input
    if (Number.isNaN(d?.getTime?.())) return "-"
    return d.toLocaleDateString("pt-BR")
}

export function formatDateLongBR(input: string | Date | null | undefined): string {
    if (!input) return "-"
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}(?:$|T|\s)/.test(input.trim())) {
        return formatDateOnlyLongPtBr(input)
    }
    const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input
    if (Number.isNaN(d?.getTime?.())) return "-"
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    })
}

// ═══════════════════════════════════════════════════════════
// NUMBER PARSING
// ═══════════════════════════════════════════════════════════

export function asNumber(v: string | number | null | undefined): number {
    const n = Number(String(v ?? "").replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

export function asNumberOrNull(v: string | number | null | undefined): number | null {
    if (v === null || v === undefined || v === "") return null
    const n = Number(String(v).replace(",", "."))
    return Number.isFinite(n) ? n : null
}

// ═══════════════════════════════════════════════════════════
// STATUS CONVERSION
// ═══════════════════════════════════════════════════════════

const statusMap: Record<string, PedidoStatus> = {
    RASCUNHO: "RASCUNHO",
    PENDENTE: "PENDENTE",
    APROVADO: "APROVADO",
    EM_COMPRA: "EM_COMPRA",
    AGUARDANDO_PAGAMENTO: "AGUARDANDO_PAGAMENTO",
    AGUARDANDO_ENTREGA: "AGUARDANDO_ENTREGA",
    ENTREGUE: "ENTREGUE",
    CANCELADO: "CANCELADO",
}

export function normalizeStatus(raw: string | null | undefined): PedidoStatus {
    const key = String(raw ?? "")
        .toUpperCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
    return statusMap[key] ?? "RASCUNHO"
}

const toSlugMap: Record<PedidoStatus, PurchaseOrderStatusSlug> = {
    RASCUNHO: "rascunho",
    PENDENTE: "pendente",
    APROVADO: "aprovado",
    EM_COMPRA: "em-compra",
    AGUARDANDO_PAGAMENTO: "aguardando-pagamento",
    AGUARDANDO_ENTREGA: "aguardando-entrega",
    ENTREGUE: "entregue",
    CANCELADO: "cancelado",
}

export function toSlugStatus(status: PedidoStatus | string): StatusSlug {
    const normalized = normalizeStatus(status)
    return (toSlugMap[normalized] ?? "rascunho") as StatusSlug
}

const fromSlugMap: Record<StatusSlug, PedidoStatus> = {
    rascunho: "RASCUNHO",
    pendente: "PENDENTE",
    aprovado: "APROVADO",
    "em-compra": "EM_COMPRA",
    "aguardando-pagamento": "AGUARDANDO_PAGAMENTO",
    "aguardando-entrega": "AGUARDANDO_ENTREGA",
    entregue: "ENTREGUE",
    cancelado: "CANCELADO",
}

export function fromSlugStatus(slug: StatusSlug): PedidoStatus {
    return fromSlugMap[slug] ?? "RASCUNHO"
}

// ═══════════════════════════════════════════════════════════
// CATEGORY CONVERSION
// ═══════════════════════════════════════════════════════════

const categoryLabelMap: Record<PedidoCategoria, PurchaseOrderCategoryLabel> = {
    TELHA: "Telha",
    MADEIRA: "Madeira",
    MATERIAIS: "Materiais",
    ANDAIMES: "Andaime", // Normalize to singular
    ANDAIME: "Andaime",
}

export function toCategoryLabel(categoria: PedidoCategoria | string): PurchaseOrderCategoryLabel {
    const key = String(categoria).toUpperCase() as PedidoCategoria
    return categoryLabelMap[key] ?? "Materiais"
}

export function normalizeCategoria(raw: string | null | undefined): PedidoCategoria | "" {
    const key = String(raw ?? "").toUpperCase().trim()
    const allowed = new Set<string>(["TELHA", "MADEIRA", "MATERIAIS", "ANDAIMES", "ANDAIME"])
    return allowed.has(key) ? (key as PedidoCategoria) : ""
}

// ═══════════════════════════════════════════════════════════
// VARIANCE CALCULATION
// ═══════════════════════════════════════════════════════════

export function calcVariancePercent(
    previsto: number | string | null | undefined,
    realizado: number | string | null | undefined
): number | null {
    const p = asNumber(previsto)
    const r = asNumber(realizado)
    if (p <= 0 || r === 0) return null
    return ((r - p) / p) * 100
}

export function calcVariance(
    previsto: number | string | null | undefined,
    realizado: number | string | null | undefined
): { diff: number; percent: number; isPositive: boolean } | null {
    const p = asNumber(previsto)
    const r = asNumber(realizado)
    if (p <= 0) return null
    const diff = r - p
    const percent = (diff / p) * 100
    return { diff, percent, isPositive: diff > 0 }
}

// ═══════════════════════════════════════════════════════════
// ID FORMATTING
// ═══════════════════════════════════════════════════════════

export function formatPedidoId(id: number | string, _obraId?: number | string | null): string {
    const n = Number(id)
    if (!Number.isFinite(n) || n <= 0) return typeof id === 'string' ? id : `TEMP-${id}`

    return `PC-${n.toString().padStart(4, '0')}`
}
