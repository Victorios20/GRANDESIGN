import { supabase } from "@/supabase/client";

export interface MaterialGeral {
  id: number;
  descricao: string;
  preco_unitario: number;
  fixo: boolean;
}

/* --------- CRUD --------- */
export async function listarMateriaisGerais() {
  const { data, error } = await supabase
    .from("materiais_gerais")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as MaterialGeral[];
}

export async function adicionarMaterialGeral(
  novo: Omit<MaterialGeral, "id">
) {
  const { data, error } = await supabase
    .from("materiais_gerais")
    .insert(novo)
    .select()
    .single();
  if (error) throw error;
  return data as MaterialGeral;
}

export async function atualizarMaterialGeral(
  id: number,
  campos: Partial<Omit<MaterialGeral, "id">>
) {
  const { error } = await supabase
    .from("materiais_gerais")
    .update(campos)
    .eq("id", id);
  if (error) throw error;
}

export async function excluirMaterialGeral(id: number) {
  const { error } = await supabase
    .from("materiais_gerais")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
