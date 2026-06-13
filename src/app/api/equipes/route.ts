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
    const preferencial = Boolean(body?.preferencial)
    const fornecedorId =
      body?.fornecedor_id === null || body?.fornecedor_id === undefined || body?.fornecedor_id === ""
        ? null
        : Number(body.fornecedor_id)

    const created = await prisma.$transaction(async (tx) => {
      // Apenas uma equipe pode ser preferencial
      if (preferencial) {
        await tx.equipes.updateMany({ data: { preferencial: false } })
      }
      return tx.equipes.create({
        data: { nome, cor, preferencial, fornecedor_id: Number.isFinite(fornecedorId) ? fornecedorId : null },
      })
    })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Falha ao criar equipe" }, { status: 500 })
  }
}
