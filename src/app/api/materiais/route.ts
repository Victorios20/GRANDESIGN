import { NextResponse } from "next/server"
import {
  listarMadeirasPorFornecedor,
  buscarMadeirasParaSelector,
  criarMadeira,
} from "@/actions/materiais-db/materiais-db"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fornecedorIdParam = searchParams.get("fornecedorId")
  const q = searchParams.get("q") || undefined
  const fornecedorId = fornecedorIdParam ? Number(fornecedorIdParam) : NaN
  if (!Number.isFinite(fornecedorId)) {
    return NextResponse.json({ error: "fornecedorId inválido" }, { status: 400 })
  }
  try {
    const data = q
      ? await buscarMadeirasParaSelector(fornecedorId, q)
      : await listarMadeirasPorFornecedor(fornecedorId)
    return NextResponse.json(data, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao listar madeiras"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { descricao, preco_unitario, unidade_de_medida, fornecedorId } = body ?? {}
  if (typeof descricao !== "string" || !descricao.trim()) {
    return NextResponse.json({ error: "Descricao obrigatória" }, { status: 400 })
  }
  const preco = Number(preco_unitario)
  if (!Number.isFinite(preco) || preco < 0) {
    return NextResponse.json({ error: "preco_unitario inválido" }, { status: 400 })
  }
  const fornId = Number(fornecedorId)
  if (!Number.isFinite(fornId)) {
    return NextResponse.json({ error: "fornecedorId inválido" }, { status: 400 })
  }
  try {
    const criado = await criarMadeira({
      descricao: descricao.trim(),
      preco_unitario: preco,
      unidade_de_medida: unidade_de_medida ?? null,
      fornecedorId: fornId,
    })
    return NextResponse.json(criado, { status: 201 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao criar madeira"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
