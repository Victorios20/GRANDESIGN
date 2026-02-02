import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function norm(v: unknown) {
  return String(v ?? "").trim()
}

function categoriaToTipo(categoria: string) {
  const c = norm(categoria).toUpperCase()
  if (c === "MADEIRA") return "madeira"
  if (c === "TELHA") return "telha"
  if (c === "MATERIAIS") return "geral"
  if (c === "ANDAIMES" || c === "ANDAIME") return "andaime"
  return null
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const categoria = norm(searchParams.get("categoria"))
  const tipo = categoriaToTipo(categoria)
  if (!tipo) {
    return NextResponse.json({ error: "categoria inválida" }, { status: 400 })
  }

  const q = norm(searchParams.get("q"))
  const fornecedorIdRaw = searchParams.get("fornecedorId")
  const fornecedorId = fornecedorIdRaw ? Number(fornecedorIdRaw) : null
  const hasFornecedor = fornecedorId != null && Number.isFinite(fornecedorId) && fornecedorId > 0

  const includeSemFornecedor = norm(searchParams.get("includeSemFornecedor")) === "1"

  const takeRaw = searchParams.get("take")
  const take = takeRaw ? Number(takeRaw) : 30
  const takeSafe = Number.isFinite(take) && take > 0 && take <= 100 ? take : 30

  const where: any = { tipo }

  if (q) {
    where.descricao = { contains: q, mode: "insensitive" }
  }

  if (hasFornecedor) {
    if (includeSemFornecedor) {
      where.OR = [{ fornecedorId }, { fornecedorId: null }]
    } else {
      where.fornecedorId = fornecedorId
    }
  }

  const rows = await prisma.materiais.findMany({
    where,
    orderBy: { descricao: "asc" },
    take: takeSafe,
    select: {
      id: true,
      descricao: true,
      tipo: true,
      preco_unitario: true,
      unidade_de_medida: true,
      fornecedorId: true,
    },
  })

  const data = rows.map((m) => ({
    id: m.id,
    descricao: m.descricao,
    tipo: m.tipo,
    preco_unitario: Number(m.preco_unitario?.toString?.() ?? 0),
    unidade_de_medida: m.unidade_de_medida ?? "un",
    fornecedorId: m.fornecedorId ?? null,
  }))

  return NextResponse.json({ data }, { status: 200 })
}
