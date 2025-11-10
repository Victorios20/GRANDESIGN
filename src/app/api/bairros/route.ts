import { NextResponse } from "next/server"
import { listarBairrosDB } from "@/actions/historico-orcamento-db/historico-orcamento-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const rows = await listarBairrosDB()
    return NextResponse.json(rows, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (err) {
    console.error("Erro ao listar bairros:", err)
    return NextResponse.json({ error: "Erro ao listar bairros" }, { status: 500 })
  }
}
