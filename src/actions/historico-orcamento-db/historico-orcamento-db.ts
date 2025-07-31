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


/* ------------------------------------------------------------------
   Tipos auxiliares
------------------------------------------------------------------ */


export interface OrcamentoTabela {
  id: number
  cliente: string
  bairro: string
  dataISO: string
  valorFormatado: string
}

/* ----- Tipagem da view ----- */
interface OrcamentoViewRow {
  id: number
  nome_cliente: string
  nome_cliente_unaccent: string
  bairro: string
  bairro_unaccent: string
  data_criacao: string
  valor_total: number | null
}

/* ------------------------------------------------------------------ */
export async function buscarOrcamentos(
  nome: string,
  bairro: string,
  dataIni: string | undefined,
  dataFim: string | undefined,
  page: number,
  perPage: number,
) {
  let query = supabase
    .from("orcamento_completo_view")
    /* 1º genérico = string   |  2º genérico = tipo da linha */
    .select<string, OrcamentoViewRow>(
      "id, nome_cliente, nome_cliente_unaccent, bairro, bairro_unaccent, data_criacao, valor_total",
      { count: "exact" },
    )

  if (nome) {
    query = query.ilike("nome_cliente_unaccent", `%${removeAcentos(nome)}%`)
  }
  if (bairro) {
    query = query.ilike("bairro_unaccent", `%${removeAcentos(bairro)}%`)
  }
  if (dataIni) query = query.gte("data_criacao", dataIni)
  if (dataFim) query = query.lte("data_criacao", dataFim)

  const { data, count, error } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1,
  )

  if (error || !data) {
    console.error("Erro ao buscar orçamentos:", error)
    return { dados: [] as OrcamentoTabela[], total: 0 }
  }

  const dados: OrcamentoTabela[] = data.map((o) => ({
    id: o.id,
    cliente: o.nome_cliente,
    bairro: o.bairro,
    dataISO: o.data_criacao,
    valorFormatado: formatarBRL(Number(o.valor_total ?? 0)),
  }))

  return { dados, total: count ?? 0 }
}

/* ----- utils ----- */
function removeAcentos(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}
function formatarBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
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