// src/app/api/admin/access/users/[id]/route.ts
// Define as exceções (overrides) de acesso de um usuário específico.
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isKnownModuleKey } from "@/lib/access/modules"

type OverrideInput = { moduleKey: string; effect: "ALLOW" | "DENY" }

export async function PUT(req: Request, context: any) {
  const session = await getServerSession(authOptions)
  const can = session?.user?.roles?.some((r: string) => r === "ADMIN" || r === "DEV")
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })

  const { id } = await context.params
  const userId = Number(id)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  let overrides: OverrideInput[] = []
  try {
    const body = await req.json()
    const raw = Array.isArray((body as any)?.overrides) ? (body as any).overrides : []
    const seen = new Set<string>()
    overrides = raw
      .map((o: any) => ({ moduleKey: String(o?.moduleKey), effect: o?.effect === "DENY" ? "DENY" : "ALLOW" }))
      .filter((o: OverrideInput) => {
        if (!isKnownModuleKey(o.moduleKey) || seen.has(o.moduleKey)) return false
        seen.add(o.moduleKey)
        return true
      }) as OverrideInput[]
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

  await prisma.$transaction([
    prisma.userModuleAccess.deleteMany({ where: { user_id: userId } }),
    prisma.userModuleAccess.createMany({
      data: overrides.map((o) => ({ user_id: userId, module_key: o.moduleKey, effect: o.effect })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ ok: true, userId, overrides })
}
