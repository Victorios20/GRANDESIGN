
import { prisma } from "@/lib/prisma"

// Mesmo shape que a tabela `tipo_obra`
export type TipoObra = {
  id: number
  tipo_obra: string
}

/** ---------- IDs prioritários (no topo) ---------- */
export const PRIORITY_IDS: number[] = [9, 3, 5, 13]

/** ---------- Ordenação: prioritários no topo, depois A–Z, e desempate por id ---------- */
export function sortTiposObra(rows: TipoObra[]): TipoObra[] {
  if (!rows?.length) return []
  const priorityIndex = new Map(PRIORITY_IDS.map((id, i) => [id, i] as const))

  return [...rows].sort((a, b) => {
    const pa = priorityIndex.has(a.id) ? priorityIndex.get(a.id)! : Infinity
    const pb = priorityIndex.has(b.id) ? priorityIndex.get(b.id)! : Infinity

    // 1) Prioritários primeiro (mantendo a ordem do array)
    if (pa !== pb) return pa - pb

    // 2) Alfabética por nome (pt-BR, case-insensitive)
    const cmp = a.tipo_obra.localeCompare(b.tipo_obra, "pt-BR", { sensitivity: "base" })
    if (cmp !== 0) return cmp

    // 3) Desempate estável por id
    return a.id - b.id
  })
}

/** ---------- SELECT + sort custom ---------- */
export async function listarTiposObra(): Promise<TipoObra[]> {
  // Traz já em A–Z pra reduzir trabalho, mas o sort final garante a prioridade custom
  const rows = await prisma.tipo_obra.findMany({
    orderBy: { tipo_obra: "asc" },
  })
  return sortTiposObra(rows as unknown as TipoObra[])
}
