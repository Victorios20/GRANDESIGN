/* ------------------------------------------------------------------
   GRANDESIGN – calcularMateriais-db.ts (versão 100% descrições exatas)
   ------------------------------------------------------------------ */
import { supabase } from "@/supabase/client"

export type TipoMaterial = "madeira" | "geral" | "telha"

export interface MaterialRow {
  id: number
  descricao: string
  tipo: TipoMaterial
  preco_unitario: number
  unidade: string
}

export interface ReceitaFixaRow {
  material_id: number
  quantidade: number
}

type MateriaisDbRow = {
  id: number
  descricao: string
  tipo: TipoMaterial
  preco_unitario: number
  unidade_de_medida: string | null
}

/* -------------------- RECEITAS FIXAS -------------------- */
export async function getReceitasFixas(
  tipoObra: string,
): Promise<ReceitaFixaRow[]> {
  const { data, error } = await supabase
    .from("receitas_fixas")
    .select("material_id, quantidade")
    .eq("tipo_obra", tipoObra)
  if (error) throw error
  return (data ?? []) as ReceitaFixaRow[]
}

/* -------------------- POR ID -------------------- */
export async function getMateriaisByIds(ids: number[]): Promise<MaterialRow[]> {
  if (!ids.length) return []
  const { data, error } = await supabase
    .from("materiais")
    .select("id, descricao, tipo, preco_unitario, unidade_de_medida")
    .in("id", ids)
  if (error) throw error
  return mapMateriais(data)
}

/* ------------------ POR DESCRIÇÃO ------------------ */
/**
 * Busca exata por descrição (alinhada ao banco).
 */
export async function getMateriaisByDescricoes(
  descricoes: string[],
): Promise<MaterialRow[]> {
  if (!descricoes.length) return []

  const { data, error } = await supabase
    .from("materiais")
    .select("id, descricao, tipo, preco_unitario, unidade_de_medida")
    .in("descricao", descricoes)

  if (error) throw error
  return mapMateriais(data)
}

/* ---------------------- MAPPER ---------------------- */
function mapMateriais(rows: MateriaisDbRow[] | null): MaterialRow[] {
  if (!rows) return []
  return rows.map(({ unidade_de_medida, ...rest }) => ({
    ...rest,
    unidade: unidade_de_medida ?? "un",
  }))
}
