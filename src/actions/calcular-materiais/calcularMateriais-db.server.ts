// src/actions/CalcularMateriais/calcularMateriais-db.server.ts
"use server"


 import { PrismaClient } from "@/generated/prisma"

export type MaterialRow = {
  id: number
  descricao: string
  tipo: string
  preco_unitario: number
  unidade: string
}

type ReceitaFixa = { material_id: number; quantidade: number }

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined
}

function getPrisma() {
  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient()
  }
  return global.__prisma__
}

const prisma = getPrisma()

/** Aceita objetos tipo Decimal.js (com toNumber), strings, bigint, etc. */
type DecimalJsLike = { toNumber?: () => number; valueOf?: () => unknown }

const toNumber = (v: unknown): number => {
  if (v == null) return 0
  if (typeof v === "number") return v
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  if (typeof v === "object") {
    const anyV = v as DecimalJsLike
    if (typeof anyV.toNumber === "function") {
      const n = anyV.toNumber()
      return typeof n === "number" && Number.isFinite(n) ? n : 0
    }
    if (typeof anyV.valueOf === "function") {
      const val = anyV.valueOf()
      if (typeof val === "number") return Number.isFinite(val) ? val : 0
      const n = Number(val as any)
      return Number.isFinite(n) ? n : 0
    }
  }
  return 0
}

type ReceitaFixaRowDB = {
  material_id: number
  quantidade: number | string | null | DecimalJsLike | unknown
}

type MaterialDBRow = {
  id: number
  descricao: string
  tipo: string
  preco_unitario: number | string | null | DecimalJsLike | unknown
  unidade_de_medida: string | null
}

const mapMaterial = (m: MaterialDBRow): MaterialRow => ({
  id: m.id,
  descricao: m.descricao,
  tipo: m.tipo,
  preco_unitario: toNumber(m.preco_unitario),
  unidade: m.unidade_de_medida ?? "un",
})

export async function getReceitasFixasServer(tipoObra: string): Promise<ReceitaFixa[]> {
  if (!tipoObra) return []
  const rows = (await prisma.receitas_fixas.findMany({
    where: { tipo_obra: tipoObra },
    select: { material_id: true, quantidade: true },
  })) as ReceitaFixaRowDB[]

  return rows.map((r) => ({
    material_id: r.material_id,
    quantidade: toNumber(r.quantidade),
  }))
}

export async function getMateriaisByIdsServer(ids: number[]): Promise<MaterialRow[]> {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const rows = (await prisma.materiais.findMany({
    where: { id: { in: ids } },
    select: { id: true, descricao: true, tipo: true, preco_unitario: true, unidade_de_medida: true },
  })) as MaterialDBRow[]
  return rows.map(mapMaterial)
}

export async function getMateriaisByDescricoesServer(descricoes: string[]): Promise<MaterialRow[]> {
  if (!Array.isArray(descricoes) || descricoes.length === 0) return []
  const rows = (await prisma.materiais.findMany({
    where: { descricao: { in: descricoes } },
    select: { id: true, descricao: true, tipo: true, preco_unitario: true, unidade_de_medida: true },
  })) as MaterialDBRow[]
  return rows.map(mapMaterial)
}
