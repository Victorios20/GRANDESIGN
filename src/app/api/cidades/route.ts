import { NextResponse } from "next/server"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"

export const dynamic = "force-dynamic" // evita cache de rota

export async function GET() {
  try {
    const rows = await getCidadesDB()
    return NextResponse.json(rows, { status: 200 })
  } catch (err) {
    console.error("Erro ao listar cidades:", err)
    return NextResponse.json({ error: "Erro ao listar cidades" }, { status: 500 })
  }
}
