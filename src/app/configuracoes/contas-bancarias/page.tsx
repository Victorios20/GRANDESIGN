import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { PageLayout } from "@/components/ui/pageLayout"
import BankAccountsPageClient from "./_components/BankAccountsPageClient"
import { authOptions } from "@/lib/auth"
import { ssrJSON } from "@/lib/ssrFetch"
import type { BankOption } from "@/types/financeiro"

export const dynamic = "force-dynamic"
export const revalidate = 0

function hasBankManagementAccess(roles: unknown) {
    return Array.isArray(roles) && roles.some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

export default async function ContasBancariasPage() {
    const session = await getServerSession(authOptions)
    const roles = (session?.user as { roles?: unknown[] } | undefined)?.roles

    if (!hasBankManagementAccess(roles)) {
        redirect("/sem-acesso")
    }

    const banks = await ssrJSON<BankOption[]>("/api/financeiro/bancos?active=false")

    return (
        <PageLayout title="Contas Bancárias">
            <BankAccountsPageClient initialBanks={banks} />
        </PageLayout>
    )
}
