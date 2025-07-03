"use server"

import { supabase } from "@/supabase/client"


export async function getFretes() {
  const { data, error } = await supabase
    .from("frete")
    .select("*")
    .order("bairro", { ascending: true })

  if (error) {
    console.error("Erro ao buscar fretes:", error)
    return []
  }

  return data
}

export async function addFrete(bairro: string, preco: number) {
  const { data, error } = await supabase
    .from("frete")
    .insert({ bairro, preco })
    .select()
    .single()

  if (error) {
    console.error("Erro ao adicionar frete:", error)
    return null
  }

  return data
}

export async function updateFrete(id: number, bairro: string, preco: number) {
  const { error } = await supabase
    .from("frete")
    .update({ bairro, preco })
    .eq("id", id)

  if (error) {
    console.error("Erro ao atualizar frete:", error)
    return false
  }

  return true
}

export async function deleteFrete(id: number) {
  const { error } = await supabase
    .from("frete")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Erro ao excluir frete:", error)
    return false
  }

  return true
}
