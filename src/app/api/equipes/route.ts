// app/api/equipes/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { listarEquipes } from "@/actions/equipes-db/equipes-db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get("q") || "").trim()
    const page = Math.max(1, Number(url.searchParams.get("page") || 1))
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 50)))

    // A action já aplica paginação e busca
    const data = await listarEquipes({ page, pageSize, search: q })

    // Para total, usa o mesmo prisma singleton (1 conexão)
    const where: Prisma.equipesWhereInput = q
      ? { nome: { contains: q, mode: "insensitive" } }
      : {}

    const total = await prisma.equipes.count({ where })

    return NextResponse.json({ data, total, page, pageSize })
  } catch (err) {
    return NextResponse.json({ error: "Falha ao listar equipes" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const nome: string = (body?.nome || "").trim()
    if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

    const cor: string | null = body?.cor || null

    const created = await prisma.equipes.create({ data: { nome, cor } })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Falha ao criar equipe" }, { status: 500 })
  }
}
