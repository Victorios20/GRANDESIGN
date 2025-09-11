/* ------------------------------------------------------------------
   Camada DB para Materiais (Prisma) – Grandesign
   - listarMateriaisPorTipoDB(tipo)
   - atualizarMaterialDB({ id, descricao?, preco_unitario? })
   - criarMaterialDB({ descricao, tipo, preco_unitario, unidade_de_medida? })
   - deletarMaterialDB(id)
------------------------------------------------------------------- */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"

export type TipoMaterial = "madeira" | "geral" | "telha"

export type MaterialCatalogItem = {
  id: number
  descricao: string
  preco_unitario: number
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function isTipoMaterial(v: unknown): v is TipoMaterial {
  return v === "madeira" || v === "geral" || v === "telha"
}

/** Lista materiais por tipo (A–Z), retornando números nativos para o preço. */
export async function listarMateriaisPorTipoDB(
  tipo: TipoMaterial
): Promise<MaterialCatalogItem[]> {
  if (!isTipoMaterial(tipo)) return []

  const rows = await prisma.materiais.findMany({
    where: { tipo },
    select: { id: true, descricao: true, preco_unitario: true },
    orderBy: { descricao: "asc" },
  })

  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    preco_unitario: toNumber(r.preco_unitario),
  }))
}

/** Atualiza material parcial (nome e/ou preço). */
export async function atualizarMaterialDB(input: {
  id: number
  descricao?: string
  preco_unitario?: number
}) {
  const id = Number(input.id)
  if (!Number.isFinite(id)) throw new Error("ID inválido")

  const data: Record<string, any> = {}

  if (typeof input.descricao === "string") {
    const d = input.descricao.trim()
    if (d.length === 0) throw new Error("Descrição não pode ser vazia")
    data.descricao = d
  }

  if (input.preco_unitario !== undefined) {
    const p = Number(input.preco_unitario)
    if (!Number.isFinite(p) || p < 0) {
      throw new Error("Preço inválido (use número ≥ 0)")
    }
    data.preco_unitario = p
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar")
  }

  try {
    const res = await prisma.materiais.update({
      where: { id },
      data,
      select: { id: true },
    })
    return res
  } catch (e: any) {
    const err = e as Prisma.PrismaClientKnownRequestError
    if (err?.code === "P2002") {
      // Unique constraint failed
      throw new Error("Já existe um material com esse nome (descrição).")
    }
    if (err?.code === "P2025") {
      // Record not found
      throw new Error("Material não encontrado para atualização.")
    }
    throw new Error("Falha ao atualizar material.")
  }
}

/** Cria um novo material (para “Adicionar”). */
export async function criarMaterialDB(input: {
  descricao: string
  tipo: TipoMaterial
  preco_unitario: number
  unidade_de_medida?: string
}) {
  const descricao = input.descricao?.trim()
  if (!descricao) throw new Error("Descrição obrigatória")

  const tipo = input.tipo
  if (!isTipoMaterial(tipo)) throw new Error("Tipo inválido (madeira|geral|telha)")

  const preco = Number(input.preco_unitario)
  if (!Number.isFinite(preco) || preco < 0) throw new Error("Preço inválido (≥ 0)")

  const un = input.unidade_de_medida?.trim() || "un"

  try {
    const created = await prisma.materiais.create({
      data: {
        descricao,
        tipo,
        preco_unitario: preco,
        unidade_de_medida: un,
      },
      select: { id: true },
    })
    return created
  } catch (e: any) {
    const err = e as Prisma.PrismaClientKnownRequestError
    if (err?.code === "P2002") {
      throw new Error("Já existe um material com esse nome (descrição).")
    }
    throw new Error("Falha ao criar material.")
  }
}

/** Deleta material por ID (trata FK). */
export async function deletarMaterialDB(id: number) {
  const mid = Number(id)
  if (!Number.isFinite(mid)) throw new Error("ID inválido")

  try {
    const res = await prisma.materiais.delete({
      where: { id: mid },
      select: { id: true },
    })
    return res
  } catch (e: any) {
    const err = e as Prisma.PrismaClientKnownRequestError
    if (err?.code === "P2025") {
      throw new Error("Material não encontrado para exclusão.")
    }
    if (err?.code === "P2003") {
      // Foreign key constraint failed
      throw new Error(
        "Não é possível excluir: material em uso (ex.: orçamentos/receitas)."
      )
    }
    throw new Error("Falha ao excluir material.")
  }
}
