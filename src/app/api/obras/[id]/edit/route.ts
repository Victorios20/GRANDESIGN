// GRANDESIGN · PUT /api/obras/[id]
import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateObraDB } from "@/actions/obras/update-obra-db"

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
  const headers = new Headers({ "Content-Type": "application/json" })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(resBody), { status, headers })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) {
      return json({ error: "unauthorized", requestId }, 401, requestId)
    }

    const obraId = Number(params.id)
    if (!Number.isFinite(obraId) || obraId <= 0) {
      return json({ error: "OBRA_ID_INVALIDO", code: "OBRA_ID_INVALIDO", requestId }, 400, requestId)
    }

    let payload: any
    try {
      payload = await req.json()
    } catch {
      return json({ error: "INVALID_JSON", requestId }, 400, requestId)
    }

    const resp = await updateObraDB(obraId, payload, actorId)

    if (!resp?.ok) {
      // respeita status sugerido pelo caso de uso
      const status = resp?.status ?? 400
      return json({ error: resp?.error ?? "UPDATE_FAILED", code: resp?.error, requestId }, status, requestId)
    }

    return json({ data: resp.data, requestId }, 200, requestId)
  } catch (err: any) {
    // erro específico do caso de uso (ex.: criar OS sem dados obrigatórios)
    if (err?.code === "ORDEM_SERVICO_DADOS_INSUFICIENTES") {
      return json({ error: err.message, code: err.code, requestId }, 400, requestId)
    }
    console.error("[PUT /api/obras/:id] unexpected", err)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
