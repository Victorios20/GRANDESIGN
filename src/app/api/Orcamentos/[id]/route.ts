// src/app/api/Orcamentos/[id]/route.ts
import { NextResponse } from "next/server"
import { getOrcamentoById, updateOrcamento } from "@/actions/edit-orcamento-db/edit-orcamento-db"

// GET /api/Orcamentos/[id]
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }

  try {
    const data = await getOrcamentoById(id)
    if (!data) return NextResponse.json({ error: "não encontrado" }, { status: 404 })
    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    console.error("GET /api/Orcamentos/[id] erro:", err)
    return NextResponse.json({ error: err?.message ?? "erro interno" }, { status: 500 })
  }
}

// PUT /api/Orcamentos/[id]
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await context.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload vazio" }, { status: 422 })
  }

  try {
    const updatedId = await updateOrcamento(id, body)
    return NextResponse.json({ id: updatedId ?? id }, { status: 200 })
  } catch (err: any) {
    const msg = String(err?.message ?? "")
    if (/\bn(ã|a)o encontrado\b|not found/i.test(msg)) {
      return NextResponse.json({ error: "não encontrado" }, { status: 404 })
    }
    if (/payload|inv[áa]lido/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 422 })
    }
    console.error("PUT /api/Orcamentos/[id] erro:", err)
    return NextResponse.json({ error: "erro interno" }, { status: 500 })
  }
}
