/**
 * GRANDESIGN Design System — Public API
 *
 * Importe de "@/components/ds" para acessar todos os componentes padronizados.
 */

export { StatusBadge } from "./StatusBadge"
export type { StatusBadgeStatus, ObraStatus, FinanceiroStatus, AgendaStatus, GenericStatus } from "./StatusBadge"

export { DataTable } from "./DataTable"
export type { DataTableColumn, DataTablePagination } from "./DataTable"

export { PageShell, OperationalShell } from "./PageShell"

export { FilterToolbar } from "./FilterToolbar"
export type { ActiveFilter } from "./FilterToolbar"

export {
  ChartWrapper,
  getDSColor,
  dsGridProps,
  dsXAxisProps,
  dsYAxisProps,
  dsTooltipProps,
} from "./ChartWrapper"
