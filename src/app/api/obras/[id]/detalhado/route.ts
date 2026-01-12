// app/api/obras/[id]/detalhado/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { detalharObraDB, AppError } from "@/actions/obras/detalhar-obra"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(body: any, status = 200, requestId?: string) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(body), { status, headers })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions as any)
    const actorId = Number((session as any)?.user?.id)
    if (!actorId) {
      return json({ error: "UNAUTHORIZED", requestId }, 401, requestId)
    }

    const { id } = await params
    const obraId = Number(id)

    const data = await detalharObraDB(obraId)
    return json({ data, requestId }, 200, requestId)
  } catch (err: any) {
    if (err instanceof AppError) {
      const status =
        err.code === "INVALID_ID" ? 400 :
        err.code === "OBRA_NOT_FOUND" ? 404 : 500
      return json({ error: err.message, code: err.code, step: err.step, requestId }, status, requestId)
    }

    console.error("[GET /obras/:id/detalhado]", err)
    return json({ error: "UNEXPECTED_ERROR", requestId }, 500, requestId)
  }
}
