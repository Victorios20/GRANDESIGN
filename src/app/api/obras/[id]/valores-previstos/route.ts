import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { BudgetSnapshotService, type BudgetSnapshotUpdateInput } from "@/services/budget-snapshot.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type SessionLike =
  | { user?: { id?: string | number | null } | null; userId?: string | number | null }
  | null
  | undefined

function getActorId(session: SessionLike): number | null {
  const raw = session?.user?.id ?? session?.userId
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function serializeSnapshot(snapshot: {
  id: number
  obra_id: number
  receita_orcada: unknown
  mao_de_obra_orcada: unknown
  madeira_previsto: unknown
  telha_previsto: unknown
  andaime_previsto: unknown
  materiais_previsto: unknown
}) {
  return {
    id: snapshot.id,
    obra_id: snapshot.obra_id,
    receita_orcada: Number(snapshot.receita_orcada ?? 0),
    mao_de_obra_orcada: Number(snapshot.mao_de_obra_orcada ?? 0),
    madeira_previsto: Number(snapshot.madeira_previsto ?? 0),
    telha_previsto: Number(snapshot.telha_previsto ?? 0),
    andaime_previsto: Number(snapshot.andaime_previsto ?? 0),
    materiais_previsto: Number(snapshot.materiais_previsto ?? 0),
  }
}

async function getAuthenticatedUserId() {
  const session = (await getServerSession(authOptions)) as SessionLike
  return getActorId(session)
}

function parseObraId(id: string) {
  const obraId = Number(id)
  return Number.isFinite(obraId) && obraId > 0 ? obraId : null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actorId = await getAuthenticatedUserId()
  if (!actorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const obraId = parseObraId(id)
  if (!obraId) return NextResponse.json({ error: "Invalid Obra ID" }, { status: 400 })

  try {
    const snapshot = await BudgetSnapshotService.getOrGenerateBaseline(obraId)
    return NextResponse.json({ data: serializeSnapshot(snapshot) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error loading budget snapshot" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actorId = await getAuthenticatedUserId()
  if (!actorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const obraId = parseObraId(id)
  if (!obraId) return NextResponse.json({ error: "Invalid Obra ID" }, { status: 400 })

  let body: BudgetSnapshotUpdateInput
  try {
    body = (await request.json()) as BudgetSnapshotUpdateInput
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  try {
    const snapshot = await BudgetSnapshotService.updateManualValues(obraId, body, actorId)
    return NextResponse.json({ data: serializeSnapshot(snapshot) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error updating budget snapshot" },
      { status: 500 }
    )
  }
}
