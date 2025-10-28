//src\app\api\obras\[id]\detalhado
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { detalharObraDB, AppError } from "@/actions/obras/detalhar-obra"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const id = Number(params.id)
  try {
    const data = await detalharObraDB(id)
    // Se quiser realmente ocultar tudo de orçamento exceto o id, descomente abaixo:
    // if (data?.orcamento) data.orcamento = { id: data.orcamento.id, titulo: null as any }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    if (err instanceof AppError) {
      const status = err.code === "OBRA_NOT_FOUND" ? 404 : err.code === "INVALID_ID" ? 400 : 500
      return NextResponse.json({ error: err.message, code: err.code, step: err.step }, { status })
    }
    return NextResponse.json({ error: "Erro inesperado." }, { status: 500 })
  }
}
