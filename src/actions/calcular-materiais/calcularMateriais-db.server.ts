import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

type MaterialRow = {
  id: number
  descricao: string
  tipo: string
  preco_unitario: number
  unidade_de_medida: string | null
  fornecedorId: number | null
}

function toNumber(n: Prisma.Decimal | number): number {
  return typeof n === "number" ? n : Number(n)
}

function sanitizeDescricoes(descricoes: string[]): string[] {
  const set = new Set<string>()
  for (const d of descricoes) {
    const s = (d ?? "").trim()
    if (s) set.add(s)
  }
  return Array.from(set)
}

export async function getMateriaisByDescricoesServer(
  descricoes: string[],
  fornecedorId: number,
  opts?: { strict?: boolean }
): Promise<MaterialRow[]> {
  const list = sanitizeDescricoes(descricoes)
  if (!list.length) return []
  if (typeof fornecedorId !== "number") {
    throw new Error("fornecedorId obrigatório")
  }

  const rows = await prisma.materiais.findMany({
    where: {
      descricao: { in: list },
      OR: [
        { AND: [{ tipo: "madeira" }, { fornecedorId }] },
        { AND: [{ NOT: { tipo: "madeira" } }, { fornecedorId: null }] },
      ],
    },
    select: {
      id: true,
      descricao: true,
      tipo: true,
      preco_unitario: true,
      unidade_de_medida: true,
      fornecedorId: true,
    },
  })

  const result: MaterialRow[] = rows.map(r => ({
    id: r.id,
    descricao: r.descricao,
    tipo: r.tipo,
    preco_unitario: toNumber(r.preco_unitario),
    unidade_de_medida: r.unidade_de_medida,
    fornecedorId: r.fornecedorId ?? null,
  }))

  if (opts?.strict !== false) {
    const found = new Set(result.map(r => r.descricao))
    const missing = list.filter(d => !found.has(d))
    if (missing.length) {
      throw new Error(`Materiais não encontrados para o fornecedor informado: ${missing.join(", ")}`)
    }
  }

  return result
}


export async function getMateriaisByIdsServer(
  ids: number[],
  fornecedorId: number,
  opts?: { strict?: boolean }
): Promise<MaterialRow[]> {
  const uniqueIds = Array.from(new Set(ids.filter(id => typeof id === "number" && Number.isFinite(id))))
  if (!uniqueIds.length) return []
  if (typeof fornecedorId !== "number") {
    throw new Error("fornecedorId obrigatório")
  }

  const rows = await prisma.materiais.findMany({
    where: {
      id: { in: uniqueIds },
      OR: [
        { AND: [{ tipo: "madeira" }, { fornecedorId }] },
        { AND: [{ NOT: { tipo: "madeira" } }, { fornecedorId: null }] },
      ],
    },
    select: {
      id: true,
      descricao: true,
      tipo: true,
      preco_unitario: true,
      unidade_de_medida: true,
      fornecedorId: true,
    },
  })

  const result: MaterialRow[] = rows.map(r => ({
    id: r.id,
    descricao: r.descricao,
    tipo: r.tipo,
    preco_unitario: toNumber(r.preco_unitario),
    unidade_de_medida: r.unidade_de_medida,
    fornecedorId: r.fornecedorId ?? null,
  }))

  if (opts?.strict !== false) {
    const found = new Set(result.map(r => r.id))
    const missing = uniqueIds.filter(id => !found.has(id))
    if (missing.length) {
      throw new Error(`IDs de materiais não encontrados para o fornecedor informado: ${missing.join(", ")}`)
    }
  }

  return result
}

export async function getReceitasFixasServer(tipoObra: string): Promise<Array<{ material_id: number; quantidade: number; componente?: string | null }>> {
  if (!tipoObra) return []
  const rows = await prisma.receitas_fixas.findMany({
    where: { tipo_obra: tipoObra },
    select: { material_id: true, quantidade: true },
    orderBy: { material_id: "asc" },
  })
  return rows.map(r => ({
    material_id: r.material_id,
    quantidade: Number(r.quantidade ?? 0),
  }))
}



