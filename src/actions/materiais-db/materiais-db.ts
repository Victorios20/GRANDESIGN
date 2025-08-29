/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/materiais-db/materiais-db.ts
   Camada DB (server-only) usando Prisma ($queryRaw).
   Contrato mantido:
   - listarMateriaisPorTipoDB("madeira"|"geral"|"telha")
     -> Array<{ descricao: string; preco_unitario: number }>
   - Ordenação A–Z por descricao
------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma"

export type MaterialCatalogItem = {
  descricao: string
  preco_unitario: number
}

/** fallback numérico leve (evita NaN) */
function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Lista materiais por tipo.
 * Saída enxuta: somente { descricao, preco_unitario }, A–Z por descricao.
 */
export async function listarMateriaisPorTipoDB(
  tipo: "madeira" | "geral" | "telha"
): Promise<MaterialCatalogItem[]> {
  // guarda de tipo (defensivo)
  if (tipo !== "madeira" && tipo !== "geral" && tipo !== "telha") return []

  try {
    const rows = (await prisma.$queryRaw`
      SELECT descricao, preco_unitario
      FROM materiais
      WHERE tipo = ${tipo}
      ORDER BY descricao ASC
    `) as Array<{ descricao: string | null; preco_unitario: unknown }>

    return rows.map((r) => ({
      descricao: r.descricao ?? "",
      preco_unitario: num(r.preco_unitario),
    }))
  } catch (err) {
    console.error("listarMateriaisPorTipoDB: erro ao listar materiais:", err)
    // mantemos o contrato de lançar em falha (rota responderá 500)
    throw err
  }
}
