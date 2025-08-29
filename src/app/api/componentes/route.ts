import { NextResponse } from "next/server"
import { listarComponentesDB } from "@/actions/componentes-db/componentes-db"

export const dynamic = "force-dynamic" // evita cache

export async function GET() {
  try {
    const rows = await listarComponentesDB()
    return NextResponse.json(rows, { status: 200 })
  } catch (err) {
    console.error("Erro ao listar componentes:", err)
    return NextResponse.json({ error: "Erro ao listar componentes" }, { status: 500 })
  }
}
