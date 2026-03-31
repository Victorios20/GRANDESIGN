import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { PageLayout } from "@/components/ui/pageLayout"
import { ssrJSON } from "@/lib/ssrFetch"
import type { CentroCustoOption } from "@/types/financeiro"
import CostCentersPageClient from "./_components/CostCentersPageClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

function hasCostCenterManagementAccess(roles: unknown) {
    return Array.isArray(roles) && roles.some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

export default async function CentrosCustoPage() {
    const session = await getServerSession(authOptions)
    const roles = (session?.user as { roles?: unknown[] } | undefined)?.roles

    if (!hasCostCenterManagementAccess(roles)) {
        redirect("/sem-acesso")
    }

    const costCenters = await ssrJSON<CentroCustoOption[]>("/api/financeiro/centros-custo?active=false")

    return (
        <PageLayout title="Centros de Custo">
            <CostCentersPageClient initialCostCenters={costCenters} />
        </PageLayout>
    )
}
