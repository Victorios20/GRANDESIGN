import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDashboardExpenseCategoryDetailData } from "@/actions/financeiro/dashboard/dashboard-data"
import { parseDashboardAccountIds, resolveDashboardFilters } from "@/lib/financeiro-dashboard"
import type { DashboardExpenseScope } from "@/types/financeiro"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const categoryId = Number(searchParams.get("category_id"))
        const scope = searchParams.get("scope") === "cost" ? "cost" : "expense"

        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            return NextResponse.json({ error: "category_id inválido." }, { status: 400 })
        }

        const filters = resolveDashboardFilters({
            period_preset: searchParams.get("period_preset"),
            period_start: searchParams.get("period_start"),
            period_end: searchParams.get("period_end"),
            account_ids: parseDashboardAccountIds(searchParams.get("account_ids")),
            analysis_status: searchParams.get("analysis_status"),
        })

        const detail = await getDashboardExpenseCategoryDetailData(filters, categoryId, scope as DashboardExpenseScope)
        return NextResponse.json(detail)
    } catch (error) {
        console.error("[Dashboard Expense Category Detail]", error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
