/* ────────────────────────────────────────────────────────────────
   PATCH para atualizar NOME (descricao) e/ou PREÇO (preco_unitario)
   DELETE para excluir material
───────────────────────────────────────────────────────────────── */
import { NextResponse } from "next/server"
import {
  atualizarMaterialDB,
  deletarMaterialDB,
} from "@/actions/materiais-db/materiais-db"

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
  const { descricao, preco_unitario } = body ?? {}

  try {
    await atualizarMaterialDB({
      id: materialId,
      descricao:
        typeof descricao === "string" && descricao.trim() !== ""
          ? descricao
          : undefined,
      // Aceita >= 0; mude para > 0 se desejar manter a regra antiga
      preco_unitario:
        preco_unitario !== undefined ? Number(preco_unitario) : undefined,
    })

    return NextResponse.json({ ok: true, id: materialId }, { status: 200 })
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
  if (!Number.isFinite(materialId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }
  try {
    await deletarMaterialDB(materialId)
    return NextResponse.json({ ok: true, id: materialId }, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao excluir material"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
