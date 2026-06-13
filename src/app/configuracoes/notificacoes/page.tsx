import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { PageLayout } from "@/components/ui/pageLayout"
import { ssrJSON } from "@/lib/ssrFetch"
import type { EmailNotificationSettings } from "@/actions/financeiro/settings/notifications"
import NotificationsPageClient from "./_components/NotificationsPageClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

function hasSettingsManagementAccess(roles: unknown) {
    return Array.isArray(roles) && roles.some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

export default async function NotificacoesPage() {
    const session = await getServerSession(authOptions)
    const roles = (session?.user as { roles?: unknown[] } | undefined)?.roles

    if (!hasSettingsManagementAccess(roles)) {
        redirect("/sem-acesso")
    }

    const settings = await ssrJSON<EmailNotificationSettings>("/api/financeiro/settings/notifications")

    return (
        <PageLayout title="Notificações">
            <NotificationsPageClient initialSettings={settings} />
        </PageLayout>
    )
}
