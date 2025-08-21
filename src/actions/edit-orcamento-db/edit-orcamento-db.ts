// src/actions/edit-orcamento-db.ts
import { supabase } from "@/supabase/client"

/** =====================================================================
 * Tipos de domínio (alinhados com o que o OrcamentoPage espera)
 * ===================================================================== */
export type Material = {
  id: number
  nome: string
  componente: string
  quantidade: number
  preco: number
  tamanho?: number | null
  frete?: number | null
}

export type GetOrcamentoResult = {
  id: number
  titulo: string
  cliente: {
    nome: string
    telefone: string
    bairro: string
    cidade: string
  }
  parametros: {
    tipoObra: string
    largura: number
    comprimento: number
    // Cobertura em L (opcionais)
    larguraMaior?: number | null
    larguraMenor?: number | null
    comprimentoMaior?: number | null
    comprimentoMenor?: number | null
  }
  materiais: {
    madeiras: Material[]
    materiaisGerais: Material[]
    telhas: Material[]
  }
  totais: {
    madeiras: number
    materiais: number
    comissao: number
    frete: number
    empresaPS: number
    empresaGD: number
  }
  links: { slideUrl: string | null; pdfUrl: string | null }
  telhaValores: Record<string, { pix: number; x10: number; x18: number }>
}

export type UpdateOrcamentoInput = {
  titulo: string
  cliente: {
    nome: string
    telefone: string
    bairro: string
    cidade: string // nome da cidade
  }
  parametros: {
    tipoObra: string
    // Agora opcionais e/ou nulos:
    largura?: number | null
    comprimento?: number | null

    // Cobertura em L (já opcionais)
    larguraMaior?: number | null
    larguraMenor?: number | null
    comprimentoMaior?: number | null
    comprimentoMenor?: number | null
  }
  materiais: {
    madeiras: Omit<Material, "id">[] | Material[]
    materiaisGerais: Omit<Material, "id">[] | Material[]
    telhas: Omit<Material, "id">[] | Material[]
  }
  totais: {
    madeiras: number
    materiais: number
    comissao: number
    frete: number
    empresaPS: number
    empresaGD: number
  }
  telhaValores: Record<string, { pix: number; x10: number; x18: number }>
  links: { slideUrl: string | null; pdfUrl: string | null }
}

/** =====================================================================
 * Tipos do SELECT bruto (para tipar corretamente os joins do Supabase)
 * ===================================================================== */
type CidadeRow = { id?: number; nome?: string | null }
type ClienteRow = {
  nome?: string | null
  telefone?: string | null
  bairro?: string | null
  cidade?: CidadeRow | CidadeRow[] | null
}
type TipoObraRow = { id?: number; tipo_obra?: string | null }

type MaterialRow = {
  tipo?: "madeira" | "geral" | "telha" | null
  descricao?: string | null
  quantidade?: number | null
  preco_unitario?: number | null
  tamanho?: number | null
  componente?: string | null
  frete?: number | null
}

type PagamentoRow = {
  tipo_telhas?: string | null
  metodo_pagamento?: "pix" | "x10" | "x18" | null
  valor?: number | null
}

type OrcamentoJoinRow = {
  id: number
  titulo?: string | null
  largura?: number | null
  comprimento?: number | null
  // Cobertura em L no BD
  largura_maior?: number | null
  largura_menor?: number | null
  comprimento_maior?: number | null
  comprimento_menor?: number | null

  link_slide?: string | null
  link_pdf?: string | null
  totais_madeiras_preco?: number | null
  totais_materiais_preco?: number | null
  totais_comissao_preco?: number | null
  totais_empresa_ps_preco?: number | null
  totais_empresa_gd_preco?: number | null
  totais_frete_preco?: number | null

  // Pode vir objeto OU array dependendo do metadado do schema
  cliente?: ClienteRow | ClienteRow[] | null
  tipo_obra?: TipoObraRow | TipoObraRow[] | null

  orcamento_material?: MaterialRow[] | null
  orcamento_pagamento?: PagamentoRow[] | null
}

/** =====================================================================
 * Helpers de normalização e números
 * ===================================================================== */
const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

const nonNeg = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? Math.max(0, v) : 0
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."))
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }
  return 0
}

/** =====================================================================
 * GET: traz absolutamente tudo no formato do componente
 * ===================================================================== */
export async function getOrcamentoById(id: number): Promise<GetOrcamentoResult> {
  const { data, error } = await supabase
    .from("orcamento")
    .select(`
      id, titulo,
      largura, comprimento,
      largura_maior, largura_menor, comprimento_maior, comprimento_menor,
      link_slide, link_pdf,
      totais_madeiras_preco, totais_materiais_preco, totais_comissao_preco,
      totais_empresa_ps_preco, totais_empresa_gd_preco, totais_frete_preco,
      cliente:cliente_id (
        nome, telefone, bairro,
        cidade:cidade_id ( nome )
      ),
      tipo_obra:tipo_obra_id ( tipo_obra ),
      orcamento_material:orcamento_material (
        tipo, descricao, quantidade, preco_unitario, tamanho, componente, frete
      ),
      orcamento_pagamento:orcamento_pagamento (
        tipo_telhas, metodo_pagamento, valor
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("[getOrcamentoById] erro:", error)
    throw new Error("Não foi possível carregar o orçamento.")
  }

  const row = data as unknown as OrcamentoJoinRow

  // cliente/tipo_obra podem vir como array; normalizamos
  const cli = first(row.cliente)
  const cidadeObj = first(cli?.cidade ?? null)
  const tpo = first(row.tipo_obra)

  // Materiais: gerar id único para ser usado como key na UI
  const toMat = (m: MaterialRow, idx: number): Material => ({
    id: Date.now() + idx + Math.floor(Math.random() * 10000),
    nome: m.descricao ?? "",
    componente: m.componente ?? "",
    quantidade: nonNeg(m.quantidade),
    preco: nonNeg(m.preco_unitario),
    tamanho: m.tamanho != null ? nonNeg(m.tamanho) : null,
    frete: m.frete != null ? nonNeg(m.frete) : (m.tipo === "telha" ? 0 : null),
  })

  const madeiras: Material[] = []
  const materiaisGerais: Material[] = []
  const telhas: Material[] = []

    ; (row.orcamento_material ?? []).forEach((m, i) => {
      const norm = toMat(m, i)
      if (m.tipo === "madeira") madeiras.push(norm)
      else if (m.tipo === "geral") materiaisGerais.push(norm)
      else if (m.tipo === "telha") telhas.push(norm)
    })

  // Pagamentos (telhaValores)
  const telhaValores: Record<string, { pix: number; x10: number; x18: number }> = {}
    ; (row.orcamento_pagamento ?? []).forEach(p => {
      const tipo = (p.tipo_telhas ?? "").trim()
      if (!tipo) return
      if (!telhaValores[tipo]) telhaValores[tipo] = { pix: 0, x10: 0, x18: 0 }
      if (p.metodo_pagamento === "pix") telhaValores[tipo].pix = nonNeg(p.valor)
      if (p.metodo_pagamento === "x10") telhaValores[tipo].x10 = nonNeg(p.valor)
      if (p.metodo_pagamento === "x18") telhaValores[tipo].x18 = nonNeg(p.valor)
    })

  return {
    id: row.id,
    titulo: row.titulo ?? "",
    cliente: {
      nome: cli?.nome ?? "",
      telefone: cli?.telefone ?? "",
      bairro: cli?.bairro ?? "",
      cidade: cidadeObj?.nome ?? "",
    },
    parametros: {
      tipoObra: tpo?.tipo_obra ?? "",
      largura: nonNeg(row.largura),
      comprimento: nonNeg(row.comprimento),
      // Cobertura em L (se não existir no BD, mantemos null)
      larguraMaior: row.largura_maior != null ? nonNeg(row.largura_maior) : null,
      larguraMenor: row.largura_menor != null ? nonNeg(row.largura_menor) : null,
      comprimentoMaior: row.comprimento_maior != null ? nonNeg(row.comprimento_maior) : null,
      comprimentoMenor: row.comprimento_menor != null ? nonNeg(row.comprimento_menor) : null,
    },
    materiais: { madeiras, materiaisGerais, telhas },
    totais: {
      madeiras: nonNeg(row.totais_madeiras_preco),
      materiais: nonNeg(row.totais_materiais_preco),
      comissao: nonNeg(row.totais_comissao_preco),
      empresaPS: nonNeg(row.totais_empresa_ps_preco),
      empresaGD: nonNeg(row.totais_empresa_gd_preco),
      frete: nonNeg(row.totais_frete_preco),
    },
    links: {
      slideUrl: row.link_slide ?? null,
      pdfUrl: row.link_pdf ?? null,
    },
    telhaValores,
  }
}

/** =====================================================================
 * UPDATE: cliente + orçamento; substitui materiais e pagamentos
 * ===================================================================== */
export async function updateOrcamento(id: number, input: UpdateOrcamentoInput): Promise<void> {
  // Descobrir IDs auxiliares por NOME
  const [{ data: cidadeRow, error: eCidade }, { data: tipoObraRow, error: eTipo }] = await Promise.all([
    supabase.from("cidades").select("id").eq("nome", input.cliente.cidade).single(),
    supabase.from("tipo_obra").select("id").eq("tipo_obra", input.parametros.tipoObra).single(),
  ])
  if (eCidade || !cidadeRow) throw new Error("Cidade não encontrada.")
  if (eTipo || !tipoObraRow) throw new Error("Tipo de obra não encontrado.")

  // Obter cliente_id do orçamento
  const { data: orcRow, error: eOrc } = await supabase
    .from("orcamento")
    .select("cliente_id")
    .eq("id", id)
    .single()
  if (eOrc || !orcRow) throw new Error("Orçamento não encontrado.")

  // Atualizar cliente
  const { error: eUpdCli } = await supabase
    .from("cliente")
    .update({
      nome: input.cliente.nome,
      telefone: input.cliente.telefone,
      bairro: input.cliente.bairro,
      cidade_id: cidadeRow.id,
    })
    .eq("id", orcRow.cliente_id)
  if (eUpdCli) throw new Error("Erro ao atualizar cliente.")

  // Dimensões extras (Cobertura em L) — aplica se vier definido; null limpa; undefined ignora
  // Dimensões — “aplica se vier definido; null limpa; undefined ignora”
  const p = input.parametros || {}
  const dimUpdate: Record<string, number | null> = {}

  if (p.largura !== undefined) dimUpdate.largura = p.largura
  if (p.comprimento !== undefined) dimUpdate.comprimento = p.comprimento
  if (p.larguraMaior !== undefined) dimUpdate.largura_maior = p.larguraMaior
  if (p.larguraMenor !== undefined) dimUpdate.largura_menor = p.larguraMenor
  if (p.comprimentoMaior !== undefined) dimUpdate.comprimento_maior = p.comprimentoMaior
  if (p.comprimentoMenor !== undefined) dimUpdate.comprimento_menor = p.comprimentoMenor

  const { error: eUpdOrc } = await supabase
    .from("orcamento")
    .update({
      titulo: input.titulo,
      tipo_obra_id: tipoObraRow.id,
      // importantíssimo: só aplica se veio definido
      ...dimUpdate,
      totais_madeiras_preco: input.totais.madeiras,
      totais_materiais_preco: input.totais.materiais,
      totais_comissao_preco: input.totais.comissao,
      totais_empresa_ps_preco: input.totais.empresaPS,
      totais_empresa_gd_preco: input.totais.empresaGD,
      totais_frete_preco: input.totais.frete,
      link_slide: input.links.slideUrl,
      link_pdf: input.links.pdfUrl,
    })
    .eq("id", id)

  if (eUpdOrc) throw new Error("Erro ao atualizar orçamento.")

  // Substituir materiais
  const { error: eDelMat } = await supabase.from("orcamento_material").delete().eq("orcamento_id", id)
  if (eDelMat) throw new Error("Erro ao limpar materiais.")

  const materiaisToInsert = [
    ...(input.materiais.madeiras ?? []).map((m) => ({
      orcamento_id: id,
      tipo: "madeira" as const,
      descricao: m.nome,
      componente: m.componente ?? "",
      quantidade: nonNeg(m.quantidade),
      preco_unitario: nonNeg(m.preco),
      tamanho: m.tamanho != null ? nonNeg(m.tamanho) : null,
      total: (m.tamanho != null ? nonNeg(m.tamanho) : 0) * nonNeg(m.quantidade) * nonNeg(m.preco),
      frete: 0,
    })),
    ...(input.materiais.materiaisGerais ?? []).map((m) => ({
      orcamento_id: id,
      tipo: "geral" as const,
      descricao: m.nome,
      componente: null,
      quantidade: nonNeg(m.quantidade),
      preco_unitario: nonNeg(m.preco),
      tamanho: null,
      total: nonNeg(m.quantidade) * nonNeg(m.preco),
      frete: 0,
    })),
    ...(input.materiais.telhas ?? []).map((m) => ({
      orcamento_id: id,
      tipo: "telha" as const,
      descricao: m.nome,
      componente: null,
      quantidade: nonNeg(m.quantidade),
      preco_unitario: nonNeg(m.preco),
      tamanho: null,
      total: nonNeg(m.quantidade) * nonNeg(m.preco) + nonNeg(m.frete),
      frete: m.frete != null ? nonNeg(m.frete) : 0,
    })),
  ]

  if (materiaisToInsert.length) {
    const { error: eInsMat } = await supabase.from("orcamento_material").insert(materiaisToInsert)
    if (eInsMat) throw new Error("Erro ao salvar materiais.")
  }

  // Substituir pagamentos (telhaValores)
  const { error: eDelPay } = await supabase.from("orcamento_pagamento").delete().eq("orcamento_id", id)
  if (eDelPay) throw new Error("Erro ao limpar pagamentos.")

  const pagamentosToInsert: {
    orcamento_id: number
    tipo_telhas: string
    metodo_pagamento: "pix" | "x10" | "x18"
    valor: number
  }[] = []

  for (const [tipo, v] of Object.entries(input.telhaValores || {})) {
    if (!v) continue
    pagamentosToInsert.push(
      { orcamento_id: id, tipo_telhas: tipo, metodo_pagamento: "pix", valor: nonNeg(v.pix) },
      { orcamento_id: id, tipo_telhas: tipo, metodo_pagamento: "x10", valor: nonNeg(v.x10) },
      { orcamento_id: id, tipo_telhas: tipo, metodo_pagamento: "x18", valor: nonNeg(v.x18) },
    )
  }

  if (pagamentosToInsert.length) {
    const { error: eInsPay } = await supabase.from("orcamento_pagamento").insert(pagamentosToInsert)
    if (eInsPay) throw new Error("Erro ao salvar pagamentos.")
  }
}
