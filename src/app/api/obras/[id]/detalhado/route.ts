// GRANDESIGN · GET /api/obras/[id]/detalhado
import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { detalharObraDB, AppError } from "@/actions/obras/detalhar-obra"

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  try {
    const session = (await getServerSession(authOptions as any)) as SessionLike
    const actorId = getActorId(session)
    if (!actorId) {
      return json({ error: "unauthorized", requestId }, 401, requestId)
    }

    const idNum = Number(params.id)
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return json({ error: "INVALID_ID", code: "INVALID_ID", step: "validate-id", requestId }, 400, requestId)
    }

    const data = await detalharObraDB(idNum)
    return json({ data, requestId }, 200, requestId)
  } catch (err: any) {
    if (err instanceof AppError) {
      const status =
        err.code === "OBRA_NOT_FOUND" ? 404 :
        err.code === "INVALID_ID" ? 400 : 500
      return json({ error: err.message, code: err.code, step: err.step, requestId }, status, requestId)
    }
    console.error("[GET /api/obras/:id/detalhado] unexpected", err)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
