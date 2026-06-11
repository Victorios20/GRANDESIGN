// src/app/api/admin/access/roles/[role]/route.ts
// Define o conjunto de módulos concedidos a um papel. ADMIN/DEV não são editáveis
// (têm acesso total por bypass no resolver).
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ADMIN_ROLE_NAMES, isKnownModuleKey } from "@/lib/access/modules"

export async function PUT(req: Request, context: any) {
  const session = await getServerSession(authOptions)
  const can = session?.user?.roles?.some((r: string) => r === "ADMIN" || r === "DEV")
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })

  const { role } = await context.params
  const roleName = String(role || "").toUpperCase()

  if ((ADMIN_ROLE_NAMES as readonly string[]).includes(roleName)) {
    return NextResponse.json(
      { error: "ADMIN e DEV têm acesso total e não são configuráveis." },
      { status: 400 }
    )
  }

  let moduleKeys: string[] = []
  try {
    const body = await req.json()
    const raw: unknown[] = Array.isArray((body as any)?.moduleKeys) ? (body as any).moduleKeys : []
    moduleKeys = [...new Set(raw.map((k) => String(k)))].filter(isKnownModuleKey)
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const roleRow = await prisma.role.findUnique({ where: { name: roleName } })
  if (!roleRow) return NextResponse.json({ error: "Papel não encontrado" }, { status: 404 })

  await prisma.$transaction([
    prisma.roleModuleAccess.deleteMany({ where: { role_id: roleRow.id } }),
    prisma.roleModuleAccess.createMany({
      data: moduleKeys.map((module_key) => ({ role_id: roleRow.id, module_key })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ ok: true, role: roleName, moduleKeys })
}
