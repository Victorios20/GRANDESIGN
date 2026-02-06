import { NextRequest, NextResponse } from "next/server"
import { listarClientes } from "@/actions/clientes-db/clientes-db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const page = searchParams.get("page") ?? "1"
    const perPage = searchParams.get("perPage") ?? "20"
    const search = searchParams.get("search")
    const telefone = searchParams.get("telefone")
    const bairro = searchParams.get("bairro")
    const cidadeId = searchParams.get("cidade_id") ?? searchParams.get("cidadeId")
    const temObras = searchParams.get("temObras")
    const temOrcamentos = searchParams.get("temOrcamentos")
    const ordem = searchParams.get("ordem")

    const out = await listarClientes({
      page,
      perPage,
      search,
      telefone,
      bairro,
      cidadeId,
      temObras,
      temOrcamentos,
      ordem,
    })

    return NextResponse.json(out, { status: 200 })
  } catch (err: any) {
    console.error("[GET /api/clientes] unexpected", err)
    return NextResponse.json({ error: "UNEXPECTED_ERROR" }, { status: 500 })
  }
}
