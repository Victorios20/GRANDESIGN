import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listarTiposObra } from "@/actions/tipo-obra-db/tipo-obra-db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const rows = await listarTiposObra()
    return NextResponse.json(rows)
  } catch (err) {
    console.error("Erro ao listar tipos de obra:", err)
    return NextResponse.json({ error: "Erro ao buscar tipos de obra" }, { status: 500 })
  }
}
