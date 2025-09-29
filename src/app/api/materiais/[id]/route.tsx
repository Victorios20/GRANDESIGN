import { NextResponse } from "next/server"
import { atualizarMaterial, removerMaterial } from "@/actions/materiais-db/materiais-db"

export const runtime = "nodejs"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const materialId = Number(id)
  if (!Number.isFinite(materialId) || materialId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({} as any))

  const descricao =
    typeof body?.descricao === "string" && body.descricao.trim() ? body.descricao.trim() : undefined

  const preco =
    body?.preco_unitario !== undefined ? Number(body.preco_unitario) : undefined
  if (preco !== undefined && (!Number.isFinite(preco) || preco < 0)) {
    return NextResponse.json({ error: "preco_unitario inválido" }, { status: 400 })
  }

  const unidade =
    body?.unidade_de_medida !== undefined ? String(body.unidade_de_medida) : undefined

  // fornecedorId é opcional; só será aplicado na action se for > 0 e se fizer sentido (madeira)
  const fornecedorIdRaw = body?.fornecedorId
  const fornecedorId =
    fornecedorIdRaw !== undefined ? Number(fornecedorIdRaw) : undefined

  const data: {
    descricao?: string
    preco_unitario?: number
    unidade_de_medida?: string | null
    fornecedorId?: number | null
  } = {}

  if (descricao !== undefined) data.descricao = descricao
  if (preco !== undefined) data.preco_unitario = preco
  if (unidade !== undefined) data.unidade_de_medida = unidade
  if (fornecedorId !== undefined) data.fornecedorId = fornecedorId

  try {
    const atualizado = await atualizarMaterial(materialId, data)
    return NextResponse.json(atualizado, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao atualizar material"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const materialId = Number(id)
  if (!Number.isFinite(materialId) || materialId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }
  try {
    const res = await removerMaterial(materialId)
    return NextResponse.json(res ?? { ok: true, id: materialId }, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao excluir material"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
