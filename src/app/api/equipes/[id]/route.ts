import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** GET /api/equipes/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  const row = await prisma.equipes.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 })
  return NextResponse.json({ data: row })
}

/** PUT /api/equipes/:id  { nome } */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const body = await req.json()
    const nome: string = (body?.nome || "").trim()
    if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

    const updated = await prisma.equipes.update({ where: { id }, data: { nome } })
    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar equipe" }, { status: 500 })
  }
}

/** DELETE /api/equipes/:id */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    await prisma.equipes.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Falha ao excluir equipe" }, { status: 500 })
  }
}
