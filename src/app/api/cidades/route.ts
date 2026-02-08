import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCidadesDB } from "@/actions/cidades-db/cidades-db"

export const dynamic = "force-dynamic" // evita cache de rota

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const rows = await getCidadesDB()
    return NextResponse.json(rows, { status: 200 })
  } catch (err) {
    console.error("Erro ao listar cidades:", err)
    return NextResponse.json({ error: "Erro ao listar cidades" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { nome, cor } = body

    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    const { addCidadeDB } = await import("@/actions/cidades-db/cidades-db")
    const cidade = await addCidadeDB(nome, cor)

    if (!cidade) {
      return NextResponse.json({ error: "Erro ao criar cidade (nome duplicado?)" }, { status: 400 })
    }

    return NextResponse.json(cidade, { status: 201 })
  } catch (err) {
    console.error("Erro ao criar cidade:", err)
    return NextResponse.json({ error: "Erro ao criar cidade" }, { status: 500 })
  }
}
