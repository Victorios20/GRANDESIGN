import { palette } from "@/lib/pedido-compra-theme"

export const purchaseOrderListPalette = {
  primary: palette.secondary,
  text: palette.primary,
  surface: palette.background,
  accent: palette.accent,
} as const

export const listShellClass =
  "rounded-2xl border border-[#e8e1d6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"

export const listSubtlePanelClass =
  "rounded-xl border border-[#ece6db] bg-[#faf8f3]"

export const listToolbarClass =
  "rounded-xl border border-[#e8e1d6] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"

export const listSelectionToolbarClass =
  "rounded-xl border border-[#ddd6c9] bg-[#f7f4ed] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"

export const listPrimaryButtonClass =
  "bg-[#393316] text-[#faf3e0] hover:bg-[#2f2a13] focus-visible:ring-[#393316]/20"

export const listGhostTextButtonClass =
  "h-9 rounded-lg px-3 text-[#6f6556] shadow-none hover:bg-[#f3efe6] hover:text-[#2c201b]"

export const listSubtleButtonClass =
  "h-9 rounded-lg border border-[#ddd7cc] bg-[#f7f4ec] text-[#393316] hover:bg-[#f1ecdf]"

export const listControlClass =
  "h-9 rounded-lg border-[#d9d3c8] bg-white text-[#2c201b] focus-visible:ring-[#393316]/15"

export const listMutedButtonClass =
  "h-9 rounded-lg border border-[#ddd7cc] bg-white px-3 text-[#2c201b] hover:bg-[#f7f4ec]"

export const listCategoryBadgeClass =
  "rounded-md border border-[#ddd7cc] bg-[#f6f4ef] px-2 py-0.5 text-[11px] font-medium tracking-[0.01em] text-[#5f584c]"

export const listIntegrationBadgeClass =
  "rounded-md border border-[#ebe5da] bg-[#faf8f4] px-2 py-0.5 text-[11px] font-medium text-[#8a7f70]"
