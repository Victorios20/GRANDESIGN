import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/** GET /api/equipes?q=&page=&pageSize= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    const page = Math.max(1, Number(searchParams.get("page") || 1))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 50)))

    const where: Prisma.equipesWhereInput = q
      ? { nome: { contains: q, mode: Prisma.QueryMode.insensitive } }
      : {}

    const [items, total] = await Promise.all([
      prisma.equipes.findMany({
        where,
        orderBy: { nome: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.equipes.count({ where }),
    ])

    return NextResponse.json({ data: items, total, page, pageSize })
  } catch (err) {
    return NextResponse.json({ error: "Falha ao listar equipes" }, { status: 500 })
  }
}

/** POST /api/equipes  { nome } */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const nome: string = (body?.nome || "").trim()
    if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

    const created = await prisma.equipes.create({ data: { nome } })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Falha ao criar equipe" }, { status: 500 })
  }
}
