import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { PageLayout } from "@/components/ui/pageLayout"
import { ssrJSON } from "@/lib/ssrFetch"
import type { CashFlowSettings } from "@/types/financeiro"
import ParametersPageClient from "./_components/ParametersPageClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

function hasSettingsManagementAccess(roles: unknown) {
    return Array.isArray(roles) && roles.some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

export default async function ParametrizacoesPage() {
    const session = await getServerSession(authOptions)
    const roles = (session?.user as { roles?: unknown[] } | undefined)?.roles

    if (!hasSettingsManagementAccess(roles)) {
        redirect("/sem-acesso")
    }

    const cashFlowSettings = await ssrJSON<CashFlowSettings>("/api/financeiro/settings/cash-flow")

    return (
        <PageLayout title="Parametrizacoes">
            <ParametersPageClient initialCashFlowSettings={cashFlowSettings} />
        </PageLayout>
    )
}
