// src/app/api/admin/users/[id]/status/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH(req: Request, context: any) {
  const session = await getServerSession(authOptions)
  const can = session?.user?.roles?.some((r: string) => r === "ADMIN" || r === "DEV")
  if (!can) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })

  const { id } = await context.params;
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  let is_active = false
  try {
    const body = await req.json()
    is_active = Boolean((body as any)?.is_active)
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  await prisma.user.update({ where: { id }, data: { is_active } })
  return NextResponse.json({ ok: true })
}
