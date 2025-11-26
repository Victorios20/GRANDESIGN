import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { salvarOrcamentoDB } from "@/actions/salvar-orcamento-db/salvar-orcamento-db"
import { buscarOrcamentosDB } from "@/actions/historico-orcamento-db/historico-orcamento-db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const revalidate = 0

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

function parseBooleanParam(v: string | null): boolean | undefined {
  if (v == null) return undefined
  const s = v.trim().toLowerCase()
  if (["1", "true", "t", "yes", "y", "sim"].includes(s)) return true
  if (["0", "false", "f", "no", "n", "nao", "não"].includes(s)) return false
  return undefined
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
  else {
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

// -------------------------------
// GET público (lista de orçamentos)
// -------------------------------
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
    const somenteLancados = parseBooleanParam(searchParams.get("somenteLancados"))

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
      somenteLancados,
    } as any)

    return NextResponse.json(
      {
        dados: result.dados,
        total: result.total,
        page,
        perPage,
        pageCount: Math.max(1, Math.ceil(result.total / perPage)),
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=60" },
      }
    )
  } catch (err) {
    return NextResponse.json({ error: "Erro ao buscar orçamentos" }, { status: 500 })
  }
}

// -------------------------------
// POST (continua com auth)
// -------------------------------
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

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

    const rawClienteId = body?.clienteId ?? body?.cliente_id ?? null
    const clienteId = Number(rawClienteId)

    // NOVO: extrair fornecedorId de formas tolerantes (id_fornecedor | fornecedorId | fornecedor.id)
    const rawFornecedorId =
      body?.fornecedorId ?? body?.fornecedor_id ?? body?.id_fornecedor ?? body?.fornecedor?.id ?? null
    const parsedF = Number(rawFornecedorId)
    const fornecedorId = Number.isFinite(parsedF) ? parsedF : null

    const materiais = body?.materiais ?? {}
    const totais = body?.totais ?? {}
    const telhaValores = body?.telhaValores ?? {}

    const actorUserId = Number((session.user as any).id)

    const id = await salvarOrcamentoDB({
      titulo,
      cliente,
      parametros,
      materiais,
      totais,
      telhaValores,
      links,
      clienteId,
      actorUserId,
      fornecedorId, // <<< repassando para a camada DB
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
