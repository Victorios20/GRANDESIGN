import { NextRequest, NextResponse } from "next/server"
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

function json(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)

    if (!actorId) {
      return json({ error: "UNAUTHORIZED", message: "Sessão expirada. Faça login novamente." }, 401)
    }

    const { id } = await params
    const obraId = Number(id)
    if (!Number.isFinite(obraId) || obraId <= 0) {
      return json({ error: "OBRA_ID_INVALIDO", message: "ID da obra inválido." }, 400)
    }

    let payload: UpdateObraPayload
    try {
      payload = await req.json()
    } catch {
      return json({ error: "INVALID_JSON", message: "Payload inválido." }, 400)
    }

    const result = await updateObraDB(obraId, payload, actorId)

    if (!result.ok) {
      return json({ error: result.code, message: result.message }, result.status ?? 500)
    }

    return json({ data: result.data }, 200)
  } catch (err) {
    console.error("[PUT /api/obras/[id]/edit] unexpected", err)
    return json({ error: "UNEXPECTED_ERROR", message: "Erro inesperado ao salvar a obra." }, 500)
  }
}
