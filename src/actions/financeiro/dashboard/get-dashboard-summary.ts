import type { DashboardAppliedFilters, DashboardSummary } from "@/types/financeiro"
import { getDashboardSummaryData } from "./dashboard-data"

export async function getDashboardSummary(filters: DashboardAppliedFilters): Promise<DashboardSummary> {
    return getDashboardSummaryData(filters)
}
