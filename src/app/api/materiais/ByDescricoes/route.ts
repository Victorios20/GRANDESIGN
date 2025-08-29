// src/app/api/materiais/ByDescricoes/route.ts
import { NextResponse } from "next/server"
import { getMateriaisByDescricoesServer } from "@/actions/calcular-materiais/calcularMateriais-db.server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const descricoes = Array.isArray(body?.descricoes)
      ? (body.descricoes as unknown[]).map((x) => (typeof x === "string" ? x : "")).filter(Boolean)
      : []

    if (descricoes.length === 0) return NextResponse.json([], { status: 200 })

    const data = await getMateriaisByDescricoesServer(descricoes)
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Falha ao obter materiais por descrições" }, { status: 500 })
  }
}
