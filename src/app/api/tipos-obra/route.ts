import { NextResponse } from "next/server"
import { listarTiposObra } from "@/actions/tipo-obra-db/tipo-obra-db"

export async function GET() {
  try {
    const rows = await listarTiposObra()
    return NextResponse.json(rows)
  } catch (err) {
    console.error("Erro ao listar tipos de obra:", err)
    return NextResponse.json({ error: "Erro ao buscar tipos de obra" }, { status: 500 })
  }
}
