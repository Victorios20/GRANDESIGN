/* ────────────────────────────────────────────────────────────────
   Acesso ao Supabase para a função de cálculo de materiais
───────────────────────────────────────────────────────────────── */
import { supabase } from "@/supabase/client";

/* ---------------- tipos ---------------- */
export type TipoMaterial = "madeira" | "geral" | "telha";

export interface MaterialRow {
  id: number;
  descricao: string;
  slug: string;
  tipo: TipoMaterial;
  preco_unitario: number;
  unidade: string;
}

export interface ReceitaFixaRow {
  material_id: number;
  quantidade: number;
}

/* ---------------- helpers ---------------- */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");

/* ---------------- consultas ---------------- */

/** Materiais fixos para o tipo de obra */
export async function getReceitasFixas(
  tipoObra: string,
): Promise<ReceitaFixaRow[]> {
  const { data, error } = await supabase
    .from("receitas_fixas")
    .select("material_id, quantidade")
    .eq("tipo_obra", tipoObra);

  if (error) throw error;
  return (data ?? []) as ReceitaFixaRow[];
}

/** Materiais por id (busca em lote) */
export async function getMateriaisByIds(
  ids: number[],
): Promise<MaterialRow[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("materiais")
    .select("*")
    .in("id", ids);

  if (error) throw error;
  return (data ?? []) as MaterialRow[];
}

/** Materiais por descrição (case-insensitive) – busca em lote */
export async function getMateriaisByDescricoes(
  descricoes: string[],
): Promise<MaterialRow[]> {
  if (!descricoes.length) return [];

  /* convertemos descrições → slug para usar índice UNIQUE(slug) */
  const slugs = descricoes.map(slugify);

  const { data, error } = await supabase
    .from("materiais")
    .select("*")
    .in("slug", slugs);

  if (error) throw error;
  return (data ?? []) as MaterialRow[];
}
