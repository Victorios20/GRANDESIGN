/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/tipo-obra-db/tipo-obra-db.ts
   ------------------------------------------------------------------ */
import { supabase } from "@/supabase/client"

/* ---------- Tipo obtido do banco ---------- */
export interface TipoObra {
  id: number
  tipo_obra: string       // coluna existente
}

/* ---------- SELECT * FROM tipo_obra ORDER BY id ---------- */
export async function listarTiposObra(): Promise<TipoObra[]> {
  const { data, error } = await supabase
    .from("tipo_obra")                 // tabela já existente
    .select("*")
    .order("id", { ascending: true })
  if (error) throw error
  return data as TipoObra[]
}
