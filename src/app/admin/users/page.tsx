// Server Component (SSR)
// Caminho: src/app/admin/users/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageLayout } from "@/components/ui/pageLayout"
import UsersTable from "./_componentes/users-table"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  const roles = (session?.user as any)?.roles ?? []

  const canAccess = Array.isArray(roles) && (roles.includes("ADMIN") || roles.includes("DEV"))
  if (!canAccess) {
    redirect("/sem-acesso")
  }

  // SSR: carrega usuários e roles direto do banco
  const [users, roleRows] = await Promise.all([
    prisma.user.findMany({
      orderBy: { created_at: "desc" },
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  const initialUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    is_active: u.is_active,
    roles: u.roles.map((r) => r.role.name),
    created_at: u.created_at.toISOString(),
  }))

  const allRoles = roleRows.map((r) => ({
    id: r.id,
    name: r.name,
    label: r.label,
  }))

  return (
    <PageLayout links={[{ href: "/", label: "Home" }, { href: "/admin/users", label: "Usuários" }]}>
      <div className="space-y-4">

        <UsersTable initialUsers={initialUsers} allRoles={allRoles} />
      </div>
    </PageLayout>
  )
}
