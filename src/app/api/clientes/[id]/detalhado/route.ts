import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const idNum = Number(id)

    if (!Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json(
        { error: "ID inválido", code: "VALIDACAO" },
        { status: 400 }
      )
    }

    const rows = await prisma.$queryRaw<
      {
        id: number
        nome: string
        telefone: string | null
        bairro: string | null
        cidade_id: number | null
        cidade_nome: string | null
        cpf: string | null
      }[]
    >`
      SELECT c.id,
             c.nome,
             c.telefone,
             c.bairro,
             c.cidade_id,
             ci.nome AS cidade_nome,
             c.cpf
      FROM public.cliente c
      LEFT JOIN public.cidades ci ON ci.id = c.cidade_id
      WHERE c.id = ${idNum}
      LIMIT 1
    `

    const c = rows?.[0]
    if (!c) {
      return NextResponse.json(
        { error: "Cliente não encontrado", code: "CLIENT_NOT_FOUND" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id: c.id,
        nome: c.nome ?? "",
        telefone: c.telefone ?? null,
        bairro: c.bairro ?? null,
        cidade_id: c.cidade_id ?? null,
        cidade_nome: c.cidade_nome ?? null,
        cpf: c.cpf ?? null,
      },
      { status: 200 }
    )
  } catch (e) {
    console.error("GET /api/clientes/[id]/detalhado error:", e)
    return NextResponse.json(
      { error: "Falha ao buscar cliente" },
      { status: 500 }
    )
  }
}
