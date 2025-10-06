import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  atualizarComponenteDB,
  deletarComponenteDB,
} from "@/actions/componentes-db/componentes-db"

export const runtime = "nodejs"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const compId = Number(id)
  if (!Number.isFinite(compId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const nome = typeof body?.nome === "string" ? body.nome.trim() : ""

  try {
    await atualizarComponenteDB({ id: compId, nome })
    return NextResponse.json({ ok: true, id: compId }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falha ao atualizar" }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const compId = Number(id)
  if (!Number.isFinite(compId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }
  try {
    await deletarComponenteDB(compId)
    return NextResponse.json({ ok: true, id: compId }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falha ao excluir" }, { status: 400 })
  }
}
