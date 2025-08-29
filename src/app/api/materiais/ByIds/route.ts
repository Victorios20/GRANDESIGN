// src/app/api/materiais/ByIds/route.ts
import { NextResponse } from "next/server"
import { getMateriaisByIdsServer } from "@/actions/calcular-materiais/calcularMateriais-db.server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawIds = Array.isArray(body?.ids) ? body.ids : []
    const ids = rawIds
      .map((x: any) => (typeof x === "string" ? Number(x) : x))
      .filter((n: any) => Number.isFinite(n))

    if (ids.length === 0) return NextResponse.json([], { status: 200 })

    const data = await getMateriaisByIdsServer(ids as number[])
    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Falha ao obter materiais por ids" }, { status: 500 })
  }
}
