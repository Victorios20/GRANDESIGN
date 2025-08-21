/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/tipo-obra-db/tipo-obra-db.ts
   ------------------------------------------------------------------ */
import { supabase } from "@/supabase/client"

/* ---------- Tipo obtido do banco ---------- */
export interface TipoObra {
  id: number
  tipo_obra: string
}

/* ---------- IDs prioritários (no topo) ---------- */
const PRIORITY_IDS: number[] = [
  9,  // Caramachão de 15
  3,  
  5, // Linha na parede de 15
  13, // Cobertura em L
]

const PRIORITY_INDEX: Record<number, number> = PRIORITY_IDS
  .reduce((acc, id, i) => { acc[id] = i; return acc }, {} as Record<number, number>)

/* ---------- Ordenação: 4 primeiros pelo id listado, resto por nome ---------- */
function sortTiposObra(arr: TipoObra[]): TipoObra[] {
  return [...arr].sort((a, b) => {
    const pa = PRIORITY_INDEX[a.id]
    const pb = PRIORITY_INDEX[b.id]

    const aIsPrio = pa !== undefined
    const bIsPrio = pb !== undefined

    if (aIsPrio && bIsPrio) return pa - pb       // entre prioritários
    if (aIsPrio && !bIsPrio) return -1           // prioritário vem antes
    if (!aIsPrio && bIsPrio) return 1

    // se não forem prioritários, ordem alfabética
    const cmp = a.tipo_obra.localeCompare(b.tipo_obra, "pt-BR", { sensitivity: "base" })
    if (cmp !== 0) return cmp

    return a.id - b.id // estabilidade
  })
}

/* ---------- SELECT + sort custom ---------- */
export async function listarTiposObra(): Promise<TipoObra[]> {
  const { data, error } = await supabase
    .from("tipo_obra")
    .select("*")
    .order("tipo_obra", { ascending: true })
  if (error) throw error

  const rows = (data ?? []) as TipoObra[]
  return sortTiposObra(rows)
}
