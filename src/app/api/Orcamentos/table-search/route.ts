import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listarOrcamentosTableSearch } from "@/actions/orcamentos-table-search/orcamentos-table-search"

function getParam(url: URL, k: string) {
  const v = url.searchParams.get(k)
  return v === null ? null : v
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const search = getParam(url, "search") || undefined
  const page = Number(getParam(url, "page") || "1")
  const perPage = Number(getParam(url, "perPage") || "20")
  const orderBy = getParam(url, "orderBy") || undefined
  const orderDir = (getParam(url, "orderDir") as "asc" | "desc" | null) || undefined
  const bairro = getParam(url, "bairro") || undefined
  const telefone = getParam(url, "telefone") || undefined
  const cidadeIdStr = getParam(url, "cidadeId")
  const tipoObraIdStr = getParam(url, "tipoObraId")
  const dIni = getParam(url, "dIni")
  const dFim = getParam(url, "dFim")
  const cidadeId = cidadeIdStr ? Number(cidadeIdStr) : null
  const tipoObraId = tipoObraIdStr ? Number(tipoObraIdStr) : null

  try {
    const res = await listarOrcamentosTableSearch({
      page,
      perPage,
      search,
      orderBy,
      orderDir,
      bairro,
      telefone,
      cidadeId,
      tipoObraId,
      dIni,
      dFim
    })
    return NextResponse.json(res, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao listar orçamentos", details: String(e?.message || e) }, { status: 500 })
  }
}
