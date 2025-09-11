import { NextResponse } from "next/server"
import {
  listarMateriaisPorTipoDB,
  criarMaterialDB,
} from "@/actions/materiais-db/materiais-db"

export const dynamic = "force-dynamic" // evita cache da rota

type Tipo = "madeira" | "geral" | "telha"

function parseTipo(input: string | null): Tipo | null {
  if (!input) return null
  const t = input.toLowerCase()
  return t === "madeira" || t === "geral" || t === "telha" ? (t as Tipo) : null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tipo = parseTipo(searchParams.get("tipo"))

    if (!tipo) {
      return NextResponse.json(
        { error: "Parâmetro 'tipo' obrigatório (madeira|geral|telha)." },
        { status: 400 }
      )
    }

    const rows = await listarMateriaisPorTipoDB(tipo)
    return NextResponse.json(rows, { status: 200 })
  } catch (err) {
    console.error("Erro ao listar materiais:", err)
    return NextResponse.json({ error: "Erro ao listar materiais" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { descricao, tipo, preco_unitario, unidade_de_medida } = body ?? {}

    const created = await criarMaterialDB({
      descricao,
      tipo,
      preco_unitario,
      unidade_de_medida,
    })

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Falha ao criar material" }, { status: 400 })
  }
}
