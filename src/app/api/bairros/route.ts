// src/app/api/bairros/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listarBairrosDB } from "@/actions/historico-orcamento-db/historico-orcamento-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const rows = await listarBairrosDB()
    return NextResponse.json(rows, { status: 200 })
  } catch (err) {
    console.error("Erro ao listar bairros:", err)
    return NextResponse.json({ error: "Erro ao listar bairros" }, { status: 500 })
  }
}
