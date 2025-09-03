/* ────────────────────────────────────────────────────────────────
   File: app/api/materiais/[id]/route.ts
   PATCH para atualizar preço do material. Mantido com runtime node.
───────────────────────────────────────────────────────────────── */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const materialId = Number(id)
  if (!Number.isFinite(materialId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const preco = Number(body?.preco_unitario)
  if (!Number.isFinite(preco) || preco <= 0) {
    return NextResponse.json(
      { error: "preco_unitario inválido" },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.materiais.update({
      where: { id: materialId },
      data: { preco_unitario: preco },
      select: { id: true },
    })
    return NextResponse.json({ ok: true, id: updated.id })
  } catch (e) {
    return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 })
  }
}
