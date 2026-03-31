import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { PageLayout } from "@/components/ui/pageLayout"
import { ssrJSON } from "@/lib/ssrFetch"
import type { CategoryOption } from "@/types/financeiro"
import FinancialCategoriesPageClient from "./_components/FinancialCategoriesPageClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

function hasCategoryManagementAccess(roles: unknown) {
    return Array.isArray(roles) && roles.some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

export default async function CategoriasFinanceirasPage() {
    const session = await getServerSession(authOptions)
    const roles = (session?.user as { roles?: unknown[] } | undefined)?.roles

    if (!hasCategoryManagementAccess(roles)) {
        redirect("/sem-acesso")
    }

    const categories = await ssrJSON<CategoryOption[]>("/api/financeiro/categories?active=false")

    return (
        <PageLayout title="Categorias Financeiras">
            <FinancialCategoriesPageClient initialCategories={categories} />
        </PageLayout>
    )
}
