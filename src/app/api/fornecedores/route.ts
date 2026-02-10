import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listarFornecedores, criarFornecedor } from "@/actions/fornecedores-db/fornecedores-db"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const { nome, tipo } = await req.json()
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    const novo = await criarFornecedor(nome, tipo)
    return NextResponse.json(novo, { status: 201 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao criar fornecedor"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const data = await listarFornecedores()
    return NextResponse.json(data, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao listar fornecedores"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
