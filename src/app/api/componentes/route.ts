import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  listarComponentesDB,
  criarComponenteDB,
} from "@/actions/componentes-db/componentes-db"

export const dynamic = "force-dynamic" // evita cache

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const rows = await listarComponentesDB()
    return NextResponse.json(rows, { status: 200 })
  } catch (err) {
    console.error("Erro ao listar componentes:", err)
    return NextResponse.json({ error: "Erro ao listar componentes" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { nome } = body ?? {}
    const created = await criarComponenteDB({ nome })
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Falha ao criar componente" }, { status: 400 })
  }
}
