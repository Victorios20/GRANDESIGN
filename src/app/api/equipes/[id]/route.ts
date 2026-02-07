// File: src/app/api/equipes/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

function toNumber(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

/** GET /api/equipes/:id */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { id: idStr } = await params
  const id = toNumber(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const row = await prisma.equipes.findUnique({ where: { id } })
  if (!row) {
    return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ data: row }, { status: 200 })
}

/** PUT /api/equipes/:id  { nome, cor? } */
export async function PUT(req: Request, { params }: { params: Params }) {
  try {
    const { id: idStr } = await params
    const id = toNumber(idStr)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const nome: string = (body?.nome ?? "").trim()
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    // cor is optional, can be null to remove or a hex string
    const cor: string | null = body?.cor !== undefined ? (body.cor || null) : undefined

    const data: { nome: string; cor?: string | null } = { nome }
    if (cor !== undefined) data.cor = cor

    const updated = await prisma.equipes.update({ where: { id }, data })
    return NextResponse.json({ data: updated }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar equipe" }, { status: 500 })
  }
}

/** DELETE /api/equipes/:id */
export async function DELETE(_req: Request, { params }: { params: Params }) {
  try {
    const { id: idStr } = await params
    const id = toNumber(idStr)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    await prisma.equipes.delete({ where: { id } })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Falha ao excluir equipe" }, { status: 500 })
  }
}
