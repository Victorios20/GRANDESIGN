import { NextResponse } from "next/server"
import { atualizarMadeira, removerMadeira } from "@/actions/materiais-db/materiais-db"

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
  const { descricao, preco_unitario, unidade_de_medida, fornecedorId } = body ?? {}
  const data: {
    descricao?: string
    preco_unitario?: number
    unidade_de_medida?: string | null
    fornecedorId?: number
  } = {}
  if (typeof descricao === "string" && descricao.trim()) data.descricao = descricao.trim()
  if (preco_unitario !== undefined) {
    const p = Number(preco_unitario)
    if (!Number.isFinite(p) || p < 0) return NextResponse.json({ error: "preco_unitario inválido" }, { status: 400 })
    data.preco_unitario = p
  }
  if (unidade_de_medida !== undefined) data.unidade_de_medida = unidade_de_medida
  if (fornecedorId !== undefined) {
    const f = Number(fornecedorId)
    if (!Number.isFinite(f)) return NextResponse.json({ error: "fornecedorId inválido" }, { status: 400 })
    data.fornecedorId = f
  }
  try {
    const atualizado = await atualizarMadeira(materialId, data)
    return NextResponse.json(atualizado, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao atualizar madeira"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const materialId = Number(id)
  if (!Number.isFinite(materialId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }
  try {
    await removerMadeira(materialId)
    return NextResponse.json({ ok: true, id: materialId }, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao excluir madeira"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
