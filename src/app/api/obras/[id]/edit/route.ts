// GRANDESIGN · PUT /api/obras/[id]
import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateObraDB, type UpdateObraPayload } from "@/actions/obras/update-obra-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SessionLike =
  | { user?: { id?: string | number | null } | null; userId?: string | number | null }
  | null
  | undefined

function getActorId(session: SessionLike): number | null {
  const raw = (session as any)?.user?.id ?? (session as any)?.userId
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function json(resBody: any, status = 200, requestId?: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(resBody), { status, headers })
}

function makeErrorBody(
  title: string,
  code: string,
  requestId: string,
  description?: string,
  meta?: any
) {
  const dev = process.env.NODE_ENV !== "production"
  const body: Record<string, any> = { title, code, requestId }
  if (dev && description) body.description = description
  if (dev && meta) body.meta = meta
  return body
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  const dev = process.env.NODE_ENV !== "production"

  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) {
      return json(
        makeErrorBody("Não autorizado", "UNAUTHORIZED", requestId, "Sessão ausente ou inválida."),
        401,
        requestId
      )
    }

    const obraId = Number(params?.id)
    if (!Number.isFinite(obraId) || obraId <= 0) {
      return json(
        makeErrorBody("ID da obra inválido", "OBRA_ID_INVALIDO", requestId, "O parâmetro 'id' deve ser um número > 0."),
        400,
        requestId
      )
    }

    const ct = (req.headers.get("content-type") || "").toLowerCase()
    if (!ct.startsWith("application/json")) {
      return json(
        makeErrorBody("Content-Type inválido", "INVALID_CONTENT_TYPE", requestId, "Use application/json no corpo da requisição."),
        415,
        requestId
      )
    }

    let payload: UpdateObraPayload
    try {
      payload = (await req.json()) as UpdateObraPayload
    } catch {
      return json(
        makeErrorBody("JSON inválido", "INVALID_JSON", requestId, "Corpo da requisição não é um JSON válido."),
        400,
        requestId
      )
    }

    const resp = await updateObraDB(obraId, payload, actorId)

    if (!resp?.ok) {
      const status = resp?.status ?? 400
      const title = (resp as any)?.title ?? "Falha ao atualizar obra"
      const code = (resp as any)?.code ?? (resp as any)?.error ?? "UPDATE_FAILED"
      const description = (resp as any)?.description ?? (resp as any)?.message
      const meta = (resp as any)?.meta
      const body = makeErrorBody(title, code, requestId, description, meta)
      console.error("[PUT /api/obras/:id] update failed", { status, ...body })
      return json(body, status, requestId)
    }

    // sucesso
    return json({ data: resp.data, requestId }, 200, requestId)
  } catch (err: any) {
    // Erros conhecidos específicos (ex.: validação da OS)
    if (err?.code === "ORDEM_SERVICO_DADOS_INSUFICIENTES") {
      const body = makeErrorBody(
        "Ordem de serviço com dados insuficientes",
        "ORDEM_SERVICO_DADOS_INSUFICIENTES",
        requestId,
        String(err?.message ?? err)
      )
      return json(body, 400, requestId)
    }

    // Prisma / erros inesperados — detalhes só em dev
    const code = err?.code || err?.name || "UNEXPECTED_ERROR"
    const message = dev ? String(err?.message ?? err) : undefined
    const meta = dev ? err?.meta : undefined
    const body = makeErrorBody("Erro inesperado", code, requestId, message, meta)
    console.error("[PUT /api/obras/:id] unexpected", { code, message, meta, requestId })
    return json(body, 500, requestId)
  }
}
