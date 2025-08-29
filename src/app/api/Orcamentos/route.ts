// app/api/orcamentos/route.ts
import { NextResponse } from "next/server"
import { salvarOrcamentoDB } from "@/actions/salvar-orcamento-db/salvar-orcamento-db"
import { buscarOrcamentosDB } from "@/actions/historico-orcamento-db/historico-orcamento-db"

export const dynamic = "force-dynamic" // evita cache

// ===== Helpers de querystring (GET) =====
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

// ===== Shape de erro (POST) =====
type ApiErrorShape = {
  error: string
  code?: string
  step?: string
  details?: any
  requestId?: string
}

// ===== Mapeamento de erro → HTTP (POST) =====
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
  else if (code === "CHECK_DUPLICATE_FAILED") status = 500
  else if (
    code === "INSERT_ORCAMENTO_FAILED" ||
    code === "INSERT_MATERIAL_FAILED" ||
    code === "INSERT_PAGAMENTO_FAILED"
  ) {
    status = 500
  } else {
    // Retrocompatibilidade por substring (throws antigos)
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

// ===== GET /api/orcamentos — Listagem da Home =====
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Mapeamento dos nomes de query -> params do DB
    const nome = searchParams.get("q") ?? undefined
    const bairro = searchParams.get("bairro") ?? undefined
    const dataIni = searchParams.get("ini") ?? undefined       // 'YYYY-MM-DD'
    const dataFim = searchParams.get("fim") ?? undefined        // 'YYYY-MM-DD'
    const page = parsePage(searchParams.get("page")) ?? 1
    const perPage = parsePageSize(searchParams.get("pageSize")) ?? 10
    const ordenarData = parseOrder(searchParams.get("ordem")) ?? "desc"

    // Valida formato básico de datas (se vierem)
    const ymd = /^\d{4}-\d{2}-\d{2}$/
    if ((dataIni && !ymd.test(dataIni)) || (dataFim && !ymd.test(dataFim))) {
      return NextResponse.json({ error: "Formato de data inválido (use YYYY-MM-DD)." }, { status: 400 })
    }

    const result = await buscarOrcamentosDB({
      nome,
      bairro,
      dataIni,
      dataFim,
      page,
      perPage,
      ordenarData,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error("Erro ao buscar orçamentos:", err)
    return NextResponse.json({ error: "Erro ao buscar orçamentos" }, { status: 500 })
  }
}

// ===== POST /api/orcamentos — Criar orçamento definitivo =====
export async function POST(req: Request) {
  const requestId = crypto.randomUUID()
  try {
    const body = await req.json()

    // Validações mínimas (mantendo comportamento existente)
    const titulo = (body?.titulo ?? "").trim()
    if (!titulo) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Título é obrigatório.", code: "MISSING_TITLE", requestId },
        { status: 400 }
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    // Para orçamentos definitivos: cidade, tipo e links são obrigatórios (mantém regra atual)
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

    // Demais dados (repasse sem transformação para manter contrato)
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
    })

    const res = NextResponse.json({ id, requestId }, { status: 201 })
    res.headers.set("X-Request-Id", requestId)
    return res
  } catch (err: any) {
    const { status, body } = mapErrorToHttp(err, requestId)
    console.error("[POST /api/orcamentos] erro", { ...body, stack: err?.stack })
    const res = NextResponse.json<ApiErrorShape>(body, { status })
    res.headers.set("X-Request-Id", requestId)
    return res
  }
}
