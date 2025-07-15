/* ────────────────────────────────────────────────────────────────
   Acesso ao Supabase para a função de cálculo de materiais
───────────────────────────────────────────────────────────────── */
import { supabase } from "@/supabase/client"

/* ---------------- tipos ---------------- */
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

/* ---------- tipo cru que vem do Supabase ---------- */
type MateriaisDbRow = {
  id: number
  descricao: string
  tipo: TipoMaterial
  preco_unitario: number
  unidade_de_medida: string | null
}

/* ---------------- consultas ---------------- */

/** Materiais fixos ligados ao tipo de obra */
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

/** Materiais por id (busca em lote) */
export async function getMateriaisByIds(
  ids: number[],
): Promise<MaterialRow[]> {
  if (!ids.length) return []

  const { data, error } = await supabase
    .from("materiais")
    .select("id, descricao, tipo, preco_unitario, unidade_de_medida")
    .in("id", ids)

  if (error) throw error
  return mapMateriais(data)
}

/** Materiais por descrição (case-insensitive) – busca em lote */
export async function getMateriaisByDescricoes(
  descricoes: string[],
): Promise<MaterialRow[]> {
  if (!descricoes.length) return []

  /* usamos .in em vez de .or para evitar erros de parsing */
  const { data, error } = await supabase
    .from("materiais")
    .select("id, descricao, tipo, preco_unitario, unidade_de_medida")
    .in("descricao", descricoes)

  if (error) throw error
  return mapMateriais(data)
}

/* ---------------- helper de mapeamento ---------------- */
function mapMateriais(rows: MateriaisDbRow[] | null): MaterialRow[] {
  if (!rows) return []
  return rows.map(({ unidade_de_medida, ...resto }) => ({
    ...resto,
    unidade: unidade_de_medida ?? "",
  }))
}
