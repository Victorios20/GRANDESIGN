// File: src/app/api/obras/[id]/contrato/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

function toNumber(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

/** PUT /api/obras/:id/contrato  { link_contrato } */
export async function PUT(req: Request, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { id: idStr } = await params
    const id = toNumber(idStr)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const link_contrato: string = (body?.link_contrato ?? "").trim()

    if (!link_contrato) {
      return NextResponse.json({ error: "link_contrato é obrigatório" }, { status: 400 })
    }

    const exists = await prisma.obras.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!exists) {
      return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 })
    }

    const updated = await prisma.obras.update({
      where: { id },
      data: { link_contrato },
    })

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar contrato da obra" }, { status: 500 })
  }
}
