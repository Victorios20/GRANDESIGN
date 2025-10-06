// src/app/api/materiais/ByDescricoes/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getMateriaisByDescricoesServer } from "@/actions/calcular-materiais/calcularMateriais-db.server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({} as any))
    const descricoes = Array.isArray(body?.descricoes)
      ? (body.descricoes as unknown[])
          .map((x) => (typeof x === "string" ? x : ""))
          .filter(Boolean)
      : []
    if (descricoes.length === 0) return NextResponse.json([], { status: 200 })

    const fornecedorIdRaw = body?.fornecedorId
    const fornecedorId =
      typeof fornecedorIdRaw === "number"
        ? fornecedorIdRaw
        : typeof fornecedorIdRaw === "string" && fornecedorIdRaw.trim() !== ""
        ? Number(fornecedorIdRaw)
        : NaN
    if (!Number.isFinite(fornecedorId)) {
      return NextResponse.json({ error: "fornecedorId obrigatório" }, { status: 400 })
    }

    const data = await getMateriaisByDescricoesServer(descricoes, fornecedorId)
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao obter materiais por descrições"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
