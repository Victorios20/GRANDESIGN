import { NextResponse } from "next/server"
import { listarFornecedores } from "@/actions/fornecedores-db/fornecedores-db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const data = await listarFornecedores()
    return NextResponse.json(data, { status: 200 })
  } catch (e: any) {
    const msg = e?.message || "Falha ao listar fornecedores"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
