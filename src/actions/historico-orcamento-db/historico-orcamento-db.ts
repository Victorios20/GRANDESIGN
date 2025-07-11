/* ────────────────────────────────────────────────────────────
   File: src/app/actions/historico-orcamentos-db.ts
   Apenas leitura (GET / SEARCH) para a Home – Histórico
──────────────────────────────────────────────────────────── */
"use client"

import { supabase } from "@/supabase/client"

/* ---------- tipos ---------- */
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

/* ---------- 1. bairros ---------- */
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
/* ---------- 2. busca resumida ---------- */
export async function buscarOrcamentos(
  nome = "",
  bairro = "",
  dataIniISO?: string,
  dataFimISO?: string
): Promise<OrcamentoTabela[]> {
  const { data, error } = await supabase
    .from("orcamento")
    .select(`
      id,
      data_criacao,
      cliente:cliente!inner(nome,bairro),
      totais_madeiras_preco,
      totais_materiais_preco,
      totais_mao_de_obra_preco,
      totais_empresa_ps_preco,
      totais_empresa_gd_preco
    `)
    .ilike("cliente.nome", `%${nome}%`)
    .ilike("cliente.bairro", bairro ? `%${bairro}%` : "%")
    .gte("data_criacao", dataIniISO ?? "1900-01-01")
    .lte("data_criacao", dataFimISO ?? "9999-12-31")
    .order("data_criacao", { ascending: false })

  if (error) {
    console.error("Erro ao buscar orçamentos:", error)
    return []
  }

  return (data ?? []).map(o => {
    const cli = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente

    const total =
      Number(o.totais_madeiras_preco) +
      Number(o.totais_materiais_preco) +
      Number(o.totais_mao_de_obra_preco) +
      Number(o.totais_empresa_ps_preco) +
      Number(o.totais_empresa_gd_preco)

    return {
      id: o.id,
      cliente: cli?.nome ?? "—",
      bairro: cli?.bairro ?? "—",
      dataISO: o.data_criacao,
      valorFormatado: `R$ ${total.toFixed(2)}`,
    }
  })
}


/* ---------- 3. detalhe ---------- */
export async function detalheOrcamento(id: number): Promise<OrcamentoDetalhe | null> {
  const { data, error } = await supabase
    .from("orcamento")
    .select(`
      id,
      data_criacao,
      cliente:cliente ( nome, telefone, bairro, cidade ),
      totais_madeiras_preco,
      totais_materiais_preco,
      totais_mao_de_obra_preco,
      totais_empresa_ps_preco,
      totais_empresa_gd_preco,
      itens:orcamento_material (
        quantidade,
        preco_unitario,
        material:materiais ( descricao, tipo )
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Erro ao buscar detalhe do orçamento:", error)
    return null
  }

  const cli = Array.isArray(data.cliente) ? data.cliente[0] : data.cliente

  const totaisParciais = {
    madeiras: Number(data.totais_madeiras_preco),
    materiais: Number(data.totais_materiais_preco),
    maoDeObra: Number(data.totais_mao_de_obra_preco),
    empresaPS: Number(data.totais_empresa_ps_preco),
    empresaGD: Number(data.totais_empresa_gd_preco),
  }

  return {
    id: data.id,
    dataISO: data.data_criacao,
    cliente: {
      nome: cli?.nome ?? "—",
      telefone: cli?.telefone ?? null,
      bairro: cli?.bairro ?? null,
      cidade: cli?.cidade ?? null,
    },
    totais: {
      ...totaisParciais,
      totalGeral: Object.values(totaisParciais).reduce((s, v) => s + v, 0),
    },
    materiais: (data.itens ?? []).map(it => {
      const mat = Array.isArray(it.material) ? it.material[0] : it.material
      return {
        nome: mat?.descricao ?? "—",
        tipo: (mat?.tipo as "madeira" | "geral" | "telha") ?? "geral",
        quantidade: Number(it.quantidade),
        precoUnit: Number(it.preco_unitario),
      }
    }),
  }
}
