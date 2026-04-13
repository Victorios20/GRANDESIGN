import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageLayout } from "@/components/ui/pageLayout"
import { operationalListPageBackgroundClass } from "@/components/ui/operational-list-styles"
import UsersTable from "./_componentes/users-table"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as { roles?: unknown[] } | undefined)?.roles ?? []

  const canAccess = Array.isArray(roles) && (roles.includes("ADMIN") || roles.includes("DEV"))
  if (!canAccess) {
    redirect("/sem-acesso")
  }

  const [users, roleRows] = await Promise.all([
    prisma.user.findMany({
      orderBy: { created_at: "desc" },
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  const initialUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    is_active: user.is_active,
    roles: user.roles.map((role) => role.role.name),
    created_at: user.created_at.toISOString(),
  }))

  const allRoles = roleRows.map((role) => ({
    id: role.id,
    name: role.name,
    label: role.label,
  }))

  return (
    <PageLayout title="Usuários" pageBackground={operationalListPageBackgroundClass}>
      <UsersTable initialUsers={initialUsers} allRoles={allRoles} />
    </PageLayout>
  )
}
