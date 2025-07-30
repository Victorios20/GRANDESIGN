// src/app/gerar-orcamento/actions/cidades-db.ts
import { supabase } from "@/supabase/client"

/** Shape usado no front */
export interface Cidade {
  id: number
  nome: string
}

/* =========================================================================
   GET – busca todas as cidades em ordem alfabética
   ========================================================================= */
export async function getCidades(): Promise<Cidade[]> {
  const { data, error } = await supabase
    .from("cidades")
    .select("*")
    .order("nome", { ascending: true })   // ordem alfabética 💡

  if (error) {
    console.error("Erro ao buscar cidades:", error)
    return []
  }

  return (
    data?.map(({ id, nome }) => ({
      id,
      nome,
    })) ?? []
  )
}

/* =========================================================================
   ADD – cadastra uma nova cidade
   ========================================================================= */
export async function addCidade(nome: string): Promise<Cidade | null> {
  const { data, error } = await supabase
    .from("cidades")
    .insert({ nome })
    .single()

  if (error) {
    console.error("Erro ao adicionar cidade:", error)
    return null
  }
  return data as Cidade
}

/* =========================================================================
   UPDATE – altera o nome de uma cidade existente
   ========================================================================= */
export async function updateCidade(id: number, nome: string): Promise<boolean> {
  const { error } = await supabase
    .from("cidades")
    .update({ nome })
    .eq("id", id)

  if (error) {
    console.error("Erro ao atualizar cidade:", error)
    return false
  }
  return true
}

/* =========================================================================
   DELETE – remove uma cidade pelo ID
   ========================================================================= */
export async function deleteCidade(id: number): Promise<boolean> {
  const { error } = await supabase
    .from("cidades")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Erro ao deletar cidade:", error)
    return false
  }
  return true
}
