import { NextResponse, NextRequest } from "next/server"
import { salvarOrcamentoDB } from "@/actions/salvar-orcamento-db/salvar-orcamento-db"
import { buscarOrcamentosDB } from "@/actions/historico-orcamento-db/historico-orcamento-db"

export const dynamic = "force-dynamic"

function parsePage(input: string | null): number | undefined {
  if (!input) return undefined
  const n = Number(input)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined
}

function parsePageSize(input: string | null): 5 | 10 | 20 | undefined {
  if (!input) return undefined
  const n = Number(input)
  return n === 5 || n === 10 || n === 20 ? (n as 5 | 10 | 20) : undefined
}

function parseOrder(input: string | null): "asc" | "desc" | undefined {
  if (!input) return undefined
  const v = input.toLowerCase()
  return v === "asc" || v === "desc" ? (v as "asc" | "desc") : undefined
}

type ApiErrorShape = {
  error: string
  code?: string
  step?: string
  details?: any
  requestId?: string
}

function mapErrorToHttp(err: any, requestId: string): { status: number; body: ApiErrorShape } {
  const code = typeof err?.code === "string" ? err.code : undefined
  const step = typeof err?.step === "string" ? err.step : undefined
  const details = err?.details
  const message =
    typeof err?.message === "string" && err.message.trim().length > 0
      ? err.message
      : "Erro ao salvar orçamento"
  let status = 500

  if (code === "DUPLICATE_TITLE") status = 409
  else if (code === "CITY_NOT_FOUND" || code === "TYPE_NOT_FOUND") status = 404
  else if (code === "CLIENT_NOT_FOUND") status = 404
  else if (code === "CLIENT_ID_REQUIRED") status = 422
  else if (code === "CHECK_DUPLICATE_FAILED") status = 500
  else if (
    code === "INSERT_ORCAMENTO_FAILED" ||
    code === "INSERT_MATERIAL_FAILED" ||
    code === "INSERT_PAGAMENTO_FAILED"
  ) {
    status = 500
  } else {
    const msg = String(message)
    if (msg.includes("Já existe um orçamento com esse título")) status = 409
    else if (msg.includes("Cidade não encontrada")) status = 404
    else if (msg.includes("Tipo de obra não encontrado")) status = 404
  }

  return {
    status,
    body: { error: message, code, step, details, requestId },
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const nome = searchParams.get("q") ?? undefined
    const bairro = searchParams.get("bairro") ?? undefined
    const telefone = searchParams.get("telefone") ?? undefined
    const cidadeIdParam = searchParams.get("cidadeId")
    const tipoObraIdParam = searchParams.get("tipoObraId")
    const dataIni = searchParams.get("ini") ?? undefined
    const dataFim = searchParams.get("fim") ?? undefined
    const page = parsePage(searchParams.get("page")) ?? 1
    const perPage = parsePageSize(searchParams.get("pageSize")) ?? 10
    const ordenarData = parseOrder(searchParams.get("ordem")) ?? "desc"

    const result = await buscarOrcamentosDB({
      nome,
      bairro,
      telefone,
      cidadeId: cidadeIdParam ? Number(cidadeIdParam) : undefined,
      tipoObraId: tipoObraIdParam ? Number(tipoObraIdParam) : undefined,
      dataIni,
      dataFim,
      page,
      perPage,
      ordenarData,
    })

    return NextResponse.json({
      dados: result.dados,
      total: result.total,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(result.total / perPage)),
    }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar orçamentos" }, { status: 500 })
  }
}


export async function POST(req: Request) {
  const requestId = crypto.randomUUID()
  try {
    const body = await req.json()
    const titulo = (body?.titulo ?? "").trim()
    if (!titulo) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Título é obrigatório.", code: "MISSING_TITLE", requestId },
        { status: 400 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    const cliente = body?.cliente ?? {}
    if (!cliente?.cidade) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Cidade é obrigatória.", code: "MISSING_CITY", requestId },
        { status: 400 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    const parametros = body?.parametros ?? {}
    if (!parametros?.tipoObra) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Tipo de obra é obrigatório.", code: "MISSING_TYPE", requestId },
        { status: 400 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    const links = body?.links ?? {}
    if (!links?.slideUrl || !links?.pdfUrl) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Links (slideUrl e pdfUrl) são obrigatórios.", code: "MISSING_LINKS", requestId },
        { status: 400 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    // >>> NOVO: extrair e repassar clienteId (top-level)
    const rawClienteId = body?.clienteId ?? body?.cliente_id ?? null
    const clienteId = Number(rawClienteId)
    // (não valide aqui; deixe a action validar e responder 422/404)

    const materiais = body?.materiais ?? {}
    const totais = body?.totais ?? {}
    const telhaValores = body?.telhaValores ?? {}

    const id = await salvarOrcamentoDB({
      titulo,
      cliente,
      parametros,
      materiais,
      totais,
      telhaValores,
      links,
      // >>> NOVO: isso resolve o CLIENT_ID_REQUIRED na action
      clienteId,
    } as any)

    const res = NextResponse.json({ id, requestId }, { status: 201 })
    res.headers.set("X-Request-Id", requestId)
    return res
  } catch (err: any) {
    const { status, body } = mapErrorToHttp(err, requestId)
    const res = NextResponse.json<ApiErrorShape>(body, { status })
    res.headers.set("X-Request-Id", requestId)
    return res
  }
}
