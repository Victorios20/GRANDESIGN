// src/app/api/CalcularMateriais/ReceitasFixas/route.ts
import { NextResponse } from "next/server"
import { getReceitasFixasServer } from "@/actions/calcular-materiais/calcularMateriais-db.server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tipoObra = searchParams.get("tipoObra") ?? ""
    if (!tipoObra) {
      return NextResponse.json({ error: "tipoObra é obrigatório" }, { status: 400 })
    }
    const data = await getReceitasFixasServer(tipoObra)
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: "Falha ao obter receitas fixas" }, { status: 500 })
  }
}
