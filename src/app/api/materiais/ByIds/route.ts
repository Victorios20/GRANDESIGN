// src/app/api/materiais/ByIds/route.ts
import { NextResponse } from "next/server"
import { getMateriaisByIdsServer } from "@/actions/calcular-materiais/calcularMateriais-db.server"

export const runtime = "nodejs"

function parseIds(input: unknown): number[] {
  if (Array.isArray(input)) {
    return input
      .map((x) => (typeof x === "string" ? Number(x) : x))
      .filter((n) => Number.isFinite(n as number)) as number[]
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
  }
  return []
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))

    const ids = parseIds(body?.ids)
    if (ids.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    const fornecedorIdRaw = body?.fornecedorId
    const fornecedorId =
      typeof fornecedorIdRaw === "string"
        ? Number(fornecedorIdRaw)
        : typeof fornecedorIdRaw === "number"
        ? fornecedorIdRaw
        : NaN

    if (!Number.isFinite(fornecedorId)) {
      return NextResponse.json({ error: "fornecedorId obrigatório" }, { status: 400 })
    }

    const includeInativos =
      typeof body?.includeInativos === "boolean"
        ? body.includeInativos
        : String(body?.includeInativos).toLowerCase() === "true"

    const data = await getMateriaisByIdsServer(ids, fornecedorId, includeInativos)
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Falha ao obter materiais por ids" }, { status: 500 })
  }
}
