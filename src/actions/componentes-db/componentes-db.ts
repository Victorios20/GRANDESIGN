/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/components-db/componentes-db.ts
   ------------------------------------------------------------------ */
import { supabase } from "@/supabase/client"

/* ---------- Tipo local ---------- */
export interface Componente {
  id: number
  nome: string
}

/* ---------- SELECT * FROM componentes ORDER BY id ---------- */
export async function listarComponentes(): Promise<Componente[]> {
  const { data, error } = await supabase
    .from("componentes")              // sem genérico aqui
    .select("*")
    .order("id", { ascending: true }) // ou .order("nome")
  if (error) throw error
  return data as Componente[]         // converte para o tipo local
}
