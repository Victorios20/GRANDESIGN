import { supabase } from "@/supabase/client";

export type TipoMaterial = "madeira" | "geral" | "telha";

export interface Material {
  id: number;
  descricao: string;
  slug: string;
  tipo: TipoMaterial;
  preco_unitario: number;
  unidade: string;
}

type CamposAtualizacao = Partial<{
  descricao: string;
  preco_unitario: number;
}>;

/* --------- CRUD Unificado --------- */
export async function listarMateriaisPorTipo(tipo: TipoMaterial): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materiais")
    .select("*")
    .eq("tipo", tipo)
    .order("descricao", { ascending: true }) 
  if (error) throw error
  return data
}


export async function adicionarMaterial(
  tipo: TipoMaterial,
  descricao: string,
  preco: number
): Promise<Material> {
  const slug = descricao
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");

  const { data, error } = await supabase
    .from("materiais")
    .insert({ descricao, slug, tipo, preco_unitario: preco, unidade: "un" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarMaterial(
  id: number,
  campos: CamposAtualizacao
): Promise<void> {
  const atualiza: Record<string, string | number> = {};
  if (campos.descricao) {
    atualiza.descricao = campos.descricao;
    atualiza.slug = campos.descricao
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");
  }
  if (campos.preco_unitario !== undefined) {
    atualiza.preco_unitario = campos.preco_unitario;
  }
  const { error } = await supabase.from("materiais").update(atualiza).eq("id", id);
  if (error) throw error;
}

export async function excluirMaterial(id: number): Promise<void> {
  const { error } = await supabase.from("materiais").delete().eq("id", id);
  if (error) throw error;
}
