import { supabase } from "@/supabase/client";

export interface MaterialMadeira {
  id: number;
  descricao: string;
  preco_metro: number;
  fixo: boolean;
}

/* --------- CRUD --------- */
export async function listarMateriaisMadeiras() {
  const { data, error } = await supabase
    .from("materiais_madeiras")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as MaterialMadeira[];
}

export async function adicionarMaterialMadeira(
  novo: Omit<MaterialMadeira, "id">
) {
  const { data, error } = await supabase
    .from("materiais_madeiras")
    .insert(novo)
    .select()
    .single();
  if (error) throw error;
  return data as MaterialMadeira;
}

export async function atualizarMaterialMadeira(
  id: number,
  campos: Partial<Omit<MaterialMadeira, "id">>
) {
  const { error } = await supabase
    .from("materiais_madeiras")
    .update(campos)
    .eq("id", id);
  if (error) throw error;
}

export async function excluirMaterialMadeira(id: number) {
  const { error } = await supabase
    .from("materiais_madeiras")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
