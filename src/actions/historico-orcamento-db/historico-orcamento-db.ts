/* ------------------------------------------------------------------
   GRANDESIGN · actions/historico-orcamento-db/historico-orcamento-db.ts
   ------------------------------------------------------------------
   Funções de acesso ao histórico de orçamentos
     1. listarBairros()
     2. buscarOrcamentos()   – paginação + filtros
     3. detalheOrcamento()   – detalhe completo (print-ready)
-------------------------------------------------------------------*/

"use client"

import { supabase } from "@/supabase/client"

/* ------------------------------------------------------------------
 *                          Tipos utilitários
 * ------------------------------------------------------------------ */

/** Shape que a lista de orçamentos (query) devolve */
export interface OrcamentoTabela {
  id: number
  titulo: string | null
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
  titulo: string | null
  titulo_unaccent: string | null
  bairro: string
  bairro_unaccent: string
  data_criacao: string
  valor_total: number | null
}

/** Shape que vem da query detalhada (raw) */
interface OrcamentoDetalheQueryRow {
  id: number
  titulo: string | null
  data_criacao: string
  largura: number
  comprimento: number
  link_slide: string | null
  link_pdf: string | null
  totais_madeiras_preco: number | null
  totais_materiais_preco: number | null
  totais_comissao_preco: number | null
  totais_empresa_ps_preco: number | null
  totais_empresa_gd_preco: number | null
  totais_frete_preco: number | null
  cliente: {
    nome: string | null
    telefone: string | null
    bairro: string | null
    cidade: { nome: string | null } | null
  }
  tipo_obra: { tipo_obra: string | null } | null
  itens: {
    quantidade: number
    preco_unitario: number
    descricao: string | null
    tipo: "madeira" | "geral" | "telha"
    componente: string | null
    tamanho: number | null
    frete: number
    total: number
  }[]
  pagamentos: {
    tipo_telhas: string
    metodo_pagamento: string
    valor: number
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
  /** extras para o print do modal */
  componente?: string | null
  tamanho?: number | null
  frete?: number | null
  total?: number | null
}

export type OrcamentoDetalhe = {
  id: number
  titulo: string | null
  dataISO: string
  tipoObra: string | null
  dimensoes: { largura: number; comprimento: number }
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
    frete: number
    totalGeral: number
  }
  /** redundante para compatibilidade antiga */
  valorTotal: number
  materiais: MaterialItem[]
  pagamentos: {
    tipoTelhas: string
    metodo: string
    valor: number
  }[]
}

/* ------------------------------------------------------------------ */
/* 1. listarBairros()                                                 */
/* ------------------------------------------------------------------ */
export async function listarBairros(): Promise<string[]> {
  const { data, error } = await supabase
    .from("orcamento_completo_view")
    .select("bairro")
    .not("bairro", "is", null)
    .neq("bairro", "")
    .order("bairro", { ascending: true })

  if (error) {
    console.error("Erro ao buscar bairros:", error)
    return []
  }

  // distinct no cliente
  return Array.from(new Set((data ?? []).map((r: any) => r.bairro)))
}


/* ------------------------------------------------------------------ */
/* 2. buscarOrcamentos() – paginação + filtros                        */
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
      "id, nome_cliente, nome_cliente_unaccent, titulo, titulo_unaccent, bairro, bairro_unaccent, data_criacao, valor_total",
      { count: "exact" },
    )

  if (nome) {
  const termo = removeAcentos(nome).trim()
  query = query.or(
    `nome_cliente_unaccent.ilike.*${termo}*,titulo_unaccent.ilike.*${termo}*`
  )
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
    console.error("Erro ao buscar orçamentos:", {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
    })
    return { dados: [] as OrcamentoTabela[], total: 0 }
  }

  const dados: OrcamentoTabela[] = data.map((o) => ({
    id: o.id,
    titulo: o.titulo,
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
/* 3. detalheOrcamento() – compatível com o schema atual              */
/* ------------------------------------------------------------------ */
export async function detalheOrcamento(id: number): Promise<OrcamentoDetalhe | null> {
  /* ---------- cabeçalho + cliente + cidade + tipo_obra ---------- */
  const { data: cabec, error: errCab } = await supabase
    .from("orcamento")
    .select(
      `
        id,
        titulo,
        data_criacao,
        largura,
        comprimento,
        link_slide,
        link_pdf,
        totais_madeiras_preco,
        totais_materiais_preco,
        totais_comissao_preco,
        totais_empresa_ps_preco,
        totais_empresa_gd_preco,
        totais_frete_preco,
        cliente:cliente (
          nome, telefone, bairro,
          cidade:cidades ( nome )
        ),
        tipo_obra:tipo_obra ( tipo_obra )
      `,
    )
    .eq("id", id)
    .single<OrcamentoDetalheQueryRow>()

  if (errCab) {
    console.error("detalheOrcamento – cabeçalho:", errCab)
    return null
  }
  if (!cabec) return null

  /* 🔽 NORMALIZA: Supabase às vezes devolve arrays de 1 item */
  const cliRow: any =
    Array.isArray((cabec as any).cliente) ? (cabec as any).cliente[0] : (cabec as any).cliente
  const cidRow: any =
    cliRow?.cidade && Array.isArray(cliRow.cidade)
      ? cliRow.cidade[0]
      : cliRow?.cidade

  /* ------------------------ materiais ------------------------- */
  const { data: mats, error: errMat } = await supabase
    .from("orcamento_material")
    .select(
      `id, tipo, descricao, componente, quantidade, tamanho, preco_unitario, frete, total`,
    )
    .eq("orcamento_id", id)

  if (errMat) console.error("detalheOrcamento – materiais:", errMat)

  /* ----------------------- pagamentos ------------------------ */
  const { data: pags, error: errPag } = await supabase
    .from("orcamento_pagamento")
    .select(`tipo_telhas, metodo_pagamento, valor`)
    .eq("orcamento_id", id)

  if (errPag) console.error("detalheOrcamento – pagamentos:", errPag)

  /* ----------------------- totais ---------------------------- */
  const tots = {
    madeiras: Number(cabec.totais_madeiras_preco ?? 0),
    materiais: Number(cabec.totais_materiais_preco ?? 0),
    comissao: Number(cabec.totais_comissao_preco ?? 0),
    empresaPS: Number(cabec.totais_empresa_ps_preco ?? 0),
    empresaGD: Number(cabec.totais_empresa_gd_preco ?? 0),
    frete: Number(cabec.totais_frete_preco ?? 0),
  }
  const valorTotal =
    tots.madeiras +
    tots.materiais +
    tots.comissao +
    tots.empresaPS +
    tots.empresaGD +
    tots.frete

  /* --------------------- retorno final ------------------------ */
  return {
    id: cabec.id,
    titulo: cabec.titulo ?? null,
    dataISO: cabec.data_criacao,
    tipoObra: (cabec.tipo_obra as any)?.tipo_obra ?? null,
    dimensoes: { largura: Number(cabec.largura ?? 0), comprimento: Number(cabec.comprimento ?? 0) },

    cliente: {
      nome: cliRow?.nome ?? "—",
      telefone: cliRow?.telefone ?? null,
      bairro: cliRow?.bairro ?? null,
      cidade: cidRow?.nome ?? null,
    },

    totais: { ...tots, totalGeral: valorTotal },
    valorTotal,

    materiais: (mats ?? []).map(m => ({
      nome: m.descricao ?? "—",
      tipo: m.tipo as "madeira" | "geral" | "telha",
      quantidade: Number(m.quantidade ?? 0),
      precoUnit: Number(m.preco_unitario ?? 0),
      componente: m.componente ?? null,
      tamanho: m.tamanho === null || m.tamanho === undefined ? null : Number(m.tamanho),
      frete: m.frete === null || m.frete === undefined ? null : Number(m.frete),
      total: m.total === null || m.total === undefined ? null : Number(m.total),
    })),

    pagamentos: (pags ?? []).map(p => ({
      tipoTelhas: p.tipo_telhas,
      metodo: p.metodo_pagamento,
      valor: Number(p.valor),
    })),
  }
}
