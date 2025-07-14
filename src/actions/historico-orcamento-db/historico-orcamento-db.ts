/* ────────────────────────────────────────────────────────────
   File: src/app/actions/historico-orcamento-db.ts
   Utilidades (somente leitura) usadas pela Home – Histórico
   • listarBairros ...... drop-down do filtro
   • buscarOrcamentos ... tabela paginada (mais recentes primeiro)
   • detalheOrcamento ... modal de detalhes
──────────────────────────────────────────────────────────── */
"use client"

import { supabase } from "@/supabase/client"
import type { OrcamentoRow, ClienteRow } from "@/lib/database.types"

/* ---------- Tipos expostos ao front ---------- */

type OrcamentoComCliente = OrcamentoRow & {
  cliente: Pick<ClienteRow, "nome" | "bairro">
}

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
    maoDeObra: number
    empresaPS: number
    empresaGD: number
    totalGeral: number
  }
  materiais: MaterialItem[]
}

/* ------------------------------------------------------------------
   1. listarBairros()
------------------------------------------------------------------- */
export async function listarBairros(): Promise<string[]> {
  const { data, error } = await supabase
    .from("frete")
    .select("bairro")
    .order("bairro")

  if (error) {
    console.error("Erro ao buscar bairros:", error)
    return []
  }
  return (data ?? []).map(r => r.bairro)
}

/* ------------------------------------------------------------------
   2. buscarOrcamentos()  –  paginação
------------------------------------------------------------------- */
export async function buscarOrcamentos(
  nome = "",
  bairro = "",
  dataIniISO?: string,
  dataFimISO?: string,
  page = 1,
  perPage = 10
): Promise<{ dados: OrcamentoTabela[], total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1

    const query = supabase
    .from("orcamento")
    .select(`
      id,
      data_criacao,
      cliente:cliente!inner ( nome, bairro ),
      totais_madeiras_preco,
      totais_materiais_preco,
      totais_mao_de_obra_preco,
      totais_empresa_ps_preco,
      totais_empresa_gd_preco
    `, { count: "exact" })
    .ilike("cliente.nome", `%${nome}%`)
    .ilike("cliente.bairro", bairro ? `%${bairro}%` : "%")
    .gte("data_criacao", dataIniISO ?? "1900-01-01")
    .lte("data_criacao", dataFimISO ?? "2100-12-31")
    .order("data_criacao", { ascending: false })   // 👈 acrescentar esta linha
    .range(from, to)


  const { data, count, error } = await query

  if (error || !data) {
    console.error("Erro ao buscar orçamentos:", error)
    return { dados: [], total: 0 }
  }

  const dados = data.map((o: any): OrcamentoTabela => {
    const cliente = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente
    return {
      id: o.id,
      cliente: cliente?.nome ?? "—",
      bairro: cliente?.bairro ?? "",
      dataISO: o.data_criacao,
      valorFormatado: `R$ ${(
        (o.totais_madeiras_preco ?? 0) +
        (o.totais_materiais_preco ?? 0) +
        (o.totais_mao_de_obra_preco ?? 0) +
        (o.totais_empresa_ps_preco ?? 0) +
        (o.totais_empresa_gd_preco ?? 0)
      ).toFixed(2)}`
    }
  })

  return { dados, total: count ?? 0 }
}

/* ------------------------------------------------------------------
   3. detalheOrcamento()
------------------------------------------------------------------- */
export async function detalheOrcamento(id: number): Promise<OrcamentoDetalhe | null> {
  const { data, error } = await supabase
    .from("orcamento")
    .select(`
      id,
      data_criacao,
      cliente:cliente!inner ( nome, telefone, bairro, cidade ),
      totais_madeiras_preco,
      totais_materiais_preco,
      totais_mao_de_obra_preco,
      totais_empresa_ps_preco,
      totais_empresa_gd_preco,
      itens:orcamento_material (
        quantidade,
        preco_unitario,
        material:materiais!inner ( descricao, tipo )
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Erro ao buscar detalhe do orçamento:", error)
    return null
  }

  const cli = data.cliente as any

  const tots = {
    madeiras: Number(data.totais_madeiras_preco),
    materiais: Number(data.totais_materiais_preco),
    maoDeObra: Number(data.totais_mao_de_obra_preco),
    empresaPS: Number(data.totais_empresa_ps_preco),
    empresaGD: Number(data.totais_empresa_gd_preco),
  }

  const materiais: MaterialItem[] = (data.itens ?? []).map((it: any) => {
    const mat = it.material
    return {
      nome: mat.descricao,
      tipo: mat.tipo,
      quantidade: Number(it.quantidade),
      precoUnit: Number(it.preco_unitario),
    }
  })

  return {
    id: data.id,
    dataISO: data.data_criacao,
    cliente: {
      nome: cli.nome,
      telefone: cli.telefone,
      bairro: cli.bairro,
      cidade: cli.cidade,
    },
    totais: {
      ...tots,
      totalGeral: Object.values(tots).reduce((s, v) => s + v, 0),
    },
    materiais,
  }
}
