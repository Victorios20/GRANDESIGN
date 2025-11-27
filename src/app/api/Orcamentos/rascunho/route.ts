// src/app/api/Orcamentos/rascunho/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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

  const friendlyByCode: Record<string, string> = {
    DUPLICATE_TITLE: "Falha ao salvar rascunho: título já existe.",
    CLIENT_ID_REQUIRED: "Falha ao salvar rascunho: selecione um cliente.",
    CLIENT_NOT_FOUND: "Falha ao salvar rascunho: cliente não encontrado.",
    CHECK_DUPLICATE_FAILED: "Falha ao salvar rascunho: erro ao verificar título.",
    INSERT_ORCAMENTO_FAILED: "Falha ao salvar rascunho.",
    INSERT_MATERIAL_FAILED: "Falha ao salvar rascunho (materiais).",
    INSERT_PAGAMENTO_FAILED: "Falha ao salvar rascunho (pagamentos).",
    TYPE_NOT_FOUND: "Falha ao salvar rascunho: tipo de obra não encontrado.",
    CITY_NOT_FOUND: "Falha ao salvar rascunho: cidade não encontrada.",
  }

  const defaultMsg = "Falha ao salvar rascunho."
  const rawMessage =
    typeof err?.message === "string" && err.message.trim().length > 0
      ? err.message.trim()
      : defaultMsg

  const message = code && friendlyByCode[code] ? friendlyByCode[code] : rawMessage

  let status = 500
  if (code === "CLIENT_ID_REQUIRED") status = 422
  else if (code === "CLIENT_NOT_FOUND") status = 404
  else if (code === "DUPLICATE_TITLE") status = 409
  else if (code === "TYPE_NOT_FOUND" || code === "CITY_NOT_FOUND") status = 404
  else if (
    code === "INSERT_ORCAMENTO_FAILED" ||
    code === "INSERT_MATERIAL_FAILED" ||
    code === "INSERT_PAGAMENTO_FAILED" ||
    code === "CHECK_DUPLICATE_FAILED"
  ) {
    status = 500
  } else {
    const msg = String(rawMessage)
    if (msg.includes("título já existe")) status = 409
    else if (msg.includes("Tipo de obra não encontrado")) status = 404
    else if (msg.includes("Cidade não encontrada")) status = 404
  }

  return {
    status,
    body: { error: message, code, step, details, requestId },
  }
}

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

    const rawClienteId = body?.clienteId ?? body?.cliente_id ?? null
    const clienteId = Number(rawClienteId)

    const cliente = body?.cliente ?? {}
    const parametros = body?.parametros ?? {}
    const materiais = body?.materiais ?? {}
    const totais = body?.totais ?? {}
    const telhaValores = body?.telhaValores ?? {}

    // Fornecedor (tolerante)
    const rawFornecedorId =
      body?.fornecedorId ?? body?.fornecedor_id ?? body?.id_fornecedor ?? body?.fornecedor?.id ?? null
    const parsedF = Number(rawFornecedorId)
    const fornecedorId = Number.isFinite(parsedF) ? parsedF : null

    // NOVO: Observações (opcional) — "" → null
    const observacoesRaw = typeof body?.observacoes === "string" ? body.observacoes.trim() : ""
    const observacoes = observacoesRaw.length ? observacoesRaw : null

    const actorUserId = Number((session.user as any).id)

    const id = await salvarRascunhoOrcamentoDB({
      titulo,
      cliente,
      parametros,
      materiais,
      totais,
      telhaValores,
      clienteId,
      actorUserId,
      fornecedorId, // mantém compat com a camada DB
      observacoes,  // <<< novo campo opcional
    } as any)

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
