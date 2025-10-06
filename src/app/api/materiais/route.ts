import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  listarMadeirasPorFornecedor,
  buscarMadeirasParaSelector,
  criarMaterial,
} from "@/actions/materiais-db/materiais-db"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fornecedorIdParam = searchParams.get("fornecedorId")
  const q = searchParams.get("q") || undefined
  const fornecedorId = fornecedorIdParam ? Number(fornecedorIdParam) : NaN
  if (!Number.isFinite(fornecedorId) || fornecedorId <= 0) {
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
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))

  const descricao = typeof body?.descricao === "string" ? body.descricao.trim() : ""
  const preco = Number(body?.preco_unitario)
  const unidade = typeof body?.unidade_de_medida === "string" ? body.unidade_de_medida : undefined

  // Permite 2 formatos:
  // A) { descricao, tipo: "geral"|"telha"|"madeira", preco_unitario, ... }
  // B) { descricao, preco_unitario, fornecedorId }  -> inferir "madeira"
  const tipoRaw = typeof body?.tipo === "string" ? body.tipo : undefined
  const fornecedorIdRaw = body?.fornecedorId
  const forn = fornecedorIdRaw !== undefined ? Number(fornecedorIdRaw) : undefined
  const hasFornecedor = forn !== undefined && Number.isFinite(forn) && forn > 0

  const tipo: "geral" | "telha" | "madeira" | undefined =
    tipoRaw && ["geral", "telha", "madeira"].includes(tipoRaw) ? (tipoRaw as any)
    : hasFornecedor ? "madeira"
    : undefined

  if (!descricao) return NextResponse.json({ error: "Descricao obrigatória" }, { status: 400 })
  if (!Number.isFinite(preco) || preco < 0) return NextResponse.json({ error: "preco_unitario inválido" }, { status: 400 })
  if (!tipo) return NextResponse.json({ error: "tipo inválido" }, { status: 400 })

  try {
    const criado = await criarMaterial({
      descricao,
      tipo,
      preco_unitario: preco,
      unidade_de_medida: unidade,
      fornecedorId: hasFornecedor ? forn : undefined,
    })
    return NextResponse.json(criado, { status: 201 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao criar material"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
