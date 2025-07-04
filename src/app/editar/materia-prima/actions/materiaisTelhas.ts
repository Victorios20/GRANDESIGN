import { supabase } from "@/supabase/client";

export interface MaterialTelha {
  id: number;
  descricao: string;
  preco_unitario: number;
}


/* --------- CRUD --------- */
export async function listarMateriaisTelhas() {
  const { data, error } = await supabase
    .from("materiais_telhas")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as MaterialTelha[];
}

export async function adicionarMaterialTelha(
  novo: Omit<MaterialTelha, "id">
) {
  const { data, error } = await supabase
    .from("materiais_telhas")
    .insert(novo)
    .select()
    .single();
  if (error) throw error;
  return data as MaterialTelha;
}

export async function atualizarMaterialTelha(
  id: number,
  campos: Partial<Omit<MaterialTelha, "id">>
) {
  const { error } = await supabase
    .from("materiais_telhas")
    .update(campos)
    .eq("id", id);
  if (error) throw error;
}

export async function excluirMaterialTelha(id: number) {
  const { error } = await supabase
    .from("materiais_telhas")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
