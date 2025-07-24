/* ------------------------------------------------------------------
   GRANDESIGN · actions/historico-orcamento-db/historico-orcamento-db.ts
   ------------------------------------------------------------------
   Funções de acesso ao histórico de orçamentos
     1. listarBairros()
     2. buscarOrcamentos()   – paginação + filtros
     3. detalheOrcamento()   – detalhe completo
-------------------------------------------------------------------*/

"use client"

import { supabase } from "@/supabase/client"

/* ------------------------------------------------------------------
 *                          Tipos utilitários
 * ------------------------------------------------------------------ */

/** Shape que a lista de orçamentos (query) devolve */
interface OrcamentoQueryRow {
  id: number
  data_criacao: string
  cliente:
    | { nome: string | null; bairro: string | null }
    | { nome: string | null; bairro: string | null }[]
  totais_madeiras_preco: number | null
  totais_materiais_preco: number | null
  totais_comissao_preco: number | null
  totais_empresa_ps_preco: number | null
  totais_empresa_gd_preco: number | null
}

/** Shape do detalhe (com itens aninhados) */
interface OrcamentoDetalheQueryRow {
  id: number
  data_criacao: string
  cliente: {
    nome: string | null
    telefone: string | null
    bairro: string | null
    cidade: string | null
  }
  totais_madeiras_preco: number | null
  totais_materiais_preco: number | null
  totais_comissao_preco: number | null
  totais_empresa_ps_preco: number | null
  totais_empresa_gd_preco: number | null
  itens: {
    quantidade: number
    preco_unitario: number
    material: {
      descricao: string
      tipo: "madeira" | "geral" | "telha"
    }
  }[]
}

/* ------------------------------------------------------------------
 *                Tipos exportados para a camada de UI
 * ------------------------------------------------------------------ */

export type OrcamentoTabela = {
  id: number
  cliente: string
  bairro: string
  dataISO: string
  valorFormatado: string
}

export type MaterialItem = {
  nome: string
  tipo: "madeira" | "geral" | "telha"
  quantidade: number
  precoUnit: number
}

export type OrcamentoDetalhe = {
  id: number
  dataISO: string
  cliente: {
    nome: string
    telefone: string | null
    bairro: string | null
    cidade: string | null
  }
  totais: {
    madeiras: number
    materiais: number
    comissao: number
    empresaPS: number
    empresaGD: number
    totalGeral: number
  }
  materiais: MaterialItem[]
}

/* ------------------------------------------------------------------ */
/* 1. listarBairros()                                                 */
/* ------------------------------------------------------------------ */
export async function listarBairros(): Promise<string[]> {
  const { data, error } = await supabase.from("frete").select("bairro").order("bairro")
  if (error) {
    console.error("Erro ao buscar bairros:", error)
    return []
  }
  return (data ?? []).map(r => r.bairro)
}

/* ------------------------------------------------------------------ */
/* 2. buscarOrcamentos() – paginação + filtros                        */
/* ------------------------------------------------------------------ */
export async function buscarOrcamentos(
  nome = "",
  bairro = "",
  dataIniISO?: string,
  dataFimISO?: string,
  page = 1,
  perPage = 10,
): Promise<{ dados: OrcamentoTabela[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const query = supabase
    .from("orcamento")
    .select(
      `
      id,
      data_criacao,
      cliente:cliente!inner ( nome, bairro ),
      totais_madeiras_preco,
      totais_materiais_preco,
      totais_comissao_preco,
      totais_empresa_ps_preco,
      totais_empresa_gd_preco
    `,
      { count: "exact" },
    )
    .ilike("cliente.nome", `%${nome}%`)
    .ilike("cliente.bairro", bairro ? `%${bairro}%` : "%")
    .gte("data_criacao", dataIniISO ?? "1900-01-01")
    .lte("data_criacao", dataFimISO ?? "2100-12-31")
    .order("data_criacao", { ascending: false })
    .range(from, to)

  const { data, count, error } = await query
  if (error || !data) {
    console.error("Erro ao buscar orçamentos:", error)
    return { dados: [], total: 0 }
  }

  const dados: OrcamentoTabela[] = (data as unknown as OrcamentoQueryRow[]).map(o => {
    const clienteObj = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente

    const total =
      (o.totais_madeiras_preco ?? 0) +
      (o.totais_materiais_preco ?? 0) +
      (o.totais_comissao_preco ?? 0) +
      (o.totais_empresa_ps_preco ?? 0) +
      (o.totais_empresa_gd_preco ?? 0)

    return {
      id: o.id,
      cliente: clienteObj?.nome ?? "—",
      bairro: clienteObj?.bairro ?? "",
      dataISO: o.data_criacao,
      valorFormatado: `R$ ${total.toFixed(2)}`,
    }
  })

  return { dados, total: count ?? 0 }
}

/* ------------------------------------------------------------------ */
/* 3. detalheOrcamento()                                              */
/* ------------------------------------------------------------------ */
export async function detalheOrcamento(id: number): Promise<OrcamentoDetalhe | null> {
  const { data, error } = await supabase
    .from("orcamento")
    .select(
      `
      id,
      data_criacao,
      cliente:cliente!inner ( nome, telefone, bairro, cidade ),
      totais_madeiras_preco,
      totais_materiais_preco,
      totais_comissao_preco,
      totais_empresa_ps_preco,
      totais_empresa_gd_preco,
      itens:orcamento_material (
        quantidade,
        preco_unitario,
        material:materiais!inner ( descricao, tipo )
      )
    `,
    )
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Erro ao buscar detalhe do orçamento:", error)
    return null
  }

  const row = data as unknown as OrcamentoDetalheQueryRow

  const tots = {
    madeiras: Number(row.totais_madeiras_preco),
    materiais: Number(row.totais_materiais_preco),
    comissao: Number(row.totais_comissao_preco),
    empresaPS: Number(row.totais_empresa_ps_preco),
    empresaGD: Number(row.totais_empresa_gd_preco),
  }

  const materiais: MaterialItem[] = row.itens.map(item => ({
    nome: item.material.descricao,
    tipo: item.material.tipo,
    quantidade: Number(item.quantidade),
    precoUnit: Number(item.preco_unitario),
  }))

  return {
    id: row.id,
    dataISO: row.data_criacao,
    cliente: {
      nome: row.cliente.nome ?? "—",
      telefone: row.cliente.telefone,
      bairro: row.cliente.bairro,
      cidade: row.cliente.cidade,
    },
    totais: { ...tots, totalGeral: Object.values(tots).reduce((s, v) => s + v, 0) },
    materiais,
  }
}
