import { NextResponse } from "next/server"
import { detalheOrcamentoDB } from "@/actions/historico-orcamento-db/historico-orcamento-db"

export const dynamic = "force-dynamic" // evita cache

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const raw = ctx.params?.id
    const id = Number(raw)

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Parâmetro 'id' inválido." }, { status: 400 })
    }

    const detalhe = await detalheOrcamentoDB(id)
    if (!detalhe) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 })
    }

    return NextResponse.json(detalhe, { status: 200 })
  } catch (err) {
    console.error("Erro ao obter detalhe do orçamento:", err)
    return NextResponse.json({ error: "Erro ao obter detalhe do orçamento" }, { status: 500 })
  }
}
