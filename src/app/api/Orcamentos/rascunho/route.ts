// app/api/orcamentos/rascunho/route.ts
import { NextResponse } from "next/server"
import { salvarRascunhoOrcamentoDB } from "@/actions/salvar-orcamento-db/salvar-orcamento-db"

export const dynamic = "force-dynamic"

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

  const message = typeof err?.message === "string" && err.message.trim().length > 0
    ? err.message
    : "Erro ao salvar rascunho"

  let status = 500
  if (code === "INSERT_ORCAMENTO_FAILED" || code === "INSERT_MATERIAL_FAILED" || code === "INSERT_PAGAMENTO_FAILED") status = 500
  // rascunho não obriga cidade/tipo/links — não mapeamos 404/409 aqui
  // Fallback por substring (caso a camada DB retorne mensagens antigas)
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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json()

    // Rascunho mantém regra atual: apenas título obrigatório
    const titulo = (body?.titulo ?? "").trim()
    if (!titulo) {
      const res = NextResponse.json<ApiErrorShape>(
        { error: "Título é obrigatório.", code: "MISSING_TITLE", requestId },
        { status: 400 },
      )
      res.headers.set("X-Request-Id", requestId)
      return res
    }

    const cliente = body?.cliente ?? {}
    const parametros = body?.parametros ?? {}
    const materiais = body?.materiais ?? {}
    const totais = body?.totais ?? {}
    const telhaValores = body?.telhaValores ?? {}

    const id = await salvarRascunhoOrcamentoDB({
      titulo,
      cliente,
      parametros,
      materiais,
      totais,
      telhaValores,
    })

    const res = NextResponse.json({ id, requestId }, { status: 201 })
    res.headers.set("X-Request-Id", requestId)
    return res
  } catch (err: any) {
    const { status, body } = mapErrorToHttp(err, requestId)
    console.error("[POST /api/orcamentos/rascunho] erro", { ...body, stack: err?.stack })
    const res = NextResponse.json<ApiErrorShape>(body, { status })
    res.headers.set("X-Request-Id", requestId)
    return res
  }
}
