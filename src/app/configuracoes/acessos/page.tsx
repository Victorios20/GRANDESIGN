import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageLayout } from "@/components/ui/pageLayout"
import { PageShell } from "@/components/ds/PageShell"
import { operationalListPageBackgroundClass } from "@/components/ui/operational-list-styles"
import { ADMIN_ROLE_NAMES, MODULE_CATALOG } from "@/lib/access/modules"
import AccessMatrix from "./_components/access-matrix"

export const dynamic = "force-dynamic"

export default async function AcessosPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as { roles?: unknown[] } | undefined)?.roles ?? []
  const canAccess = Array.isArray(roles) && (roles.includes("ADMIN") || roles.includes("DEV"))
  if (!canAccess) {
    redirect("/sem-acesso")
  }

  const [roleRows, userRows] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" }, include: { moduleAccess: true } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { roles: { include: { role: true } }, moduleOverrides: true },
    }),
  ])

  const adminNames = ADMIN_ROLE_NAMES as readonly string[]

  const initialRoles = roleRows.map((role) => ({
    id: role.id,
    name: role.name,
    label: role.label,
    isAdmin: adminNames.includes(role.name.toUpperCase()),
    moduleKeys: role.moduleAccess.map((m) => m.module_key),
  }))

  const initialUsers = userRows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles.map((r) => r.role.name),
    overrides: user.moduleOverrides.map((o) => ({ moduleKey: o.module_key, effect: o.effect })),
  }))

  const catalog = MODULE_CATALOG.map((m) => ({ key: m.key, label: m.label, group: m.group }))

  return (
    <PageLayout pageBackground={operationalListPageBackgroundClass}>
      <PageShell
        title="Acessos"
        description="Configure quais módulos cada papel acessa e ajuste exceções por usuário."
      >
        <AccessMatrix catalog={catalog} initialRoles={initialRoles} initialUsers={initialUsers} />
      </PageShell>
    </PageLayout>
  )
}
