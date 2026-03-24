/* ------------------------------------------------------------------
   GRANDESIGN · src/actions/salvar-orcamento-db/salvar-orcamento-db.ts
   Camada DB (server-only) usando Prisma ($queryRaw / $executeRaw).
   - Mantém contratos e regras do Supabase (sem regressão de front)
   - Transação para não deixar dados parciais
   - Dimensões: salva SEM CONDICIONAL, aceitando null nos 6 campos
------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma"
/** ================================================================
 * AppError (códigos e contexto)
 * - Não altera funcionalidade nem contratos; só enriquece erros.
 * ================================================================ */
export type AppErrorCode =
  | "DUPLICATE_TITLE"
  | "CHECK_DUPLICATE_FAILED"
  | "CITY_NOT_FOUND"
  | "TYPE_NOT_FOUND"
  | "INSERT_ORCAMENTO_FAILED"
  | "INSERT_MATERIAL_FAILED"
  | "INSERT_PAGAMENTO_FAILED"
  | "CLIENT_ID_REQUIRED"
  | "CLIENT_NOT_FOUND"

class AppError extends Error {
  code: AppErrorCode
  step?: string
  details?: Record<string, unknown>
  constructor(code: AppErrorCode, message: string, step?: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.step = step
    this.details = details
  }
}

function logError(context: string, payload: Record<string, unknown>) {
  try {
    console.error(`[salvar-orcamento-db] ${context}`, payload)
  } catch {}
}

/* ================================================================
 * Tipos de entrada (espelham o payload que a página já envia)
 * ================================================================ */

export type MaterialInput = {
  nome: string
  componente?: string | null
  quantidade: number
  preco: number
  tamanho?: number | string | null
  frete?: number | null
}

export type ClienteInput = {
  nome: string
  telefone: string
  bairro: string
  cidade?: string | null
}

export type ParametrosInput = {
  tipoObraId?: number | null
  tipoObra?: string | null
  largura?: number | null
  comprimento?: number | null
  larguraMaior?: number | null
  larguraMenor?: number | null
  comprimentoMaior?: number | null
  comprimentoMenor?: number | null
}

export type TotaisInput = {
  madeiras: number
  materiais: number
  comissao: number
  empresaPS: number
  empresaGD: number
  frete: number
}

export type TelhaValoresInput = Record<string, { pix: number; x10: number; x18: number }>

export type LinksInput = {
  slideUrl: string
  pdfUrl: string
}

export type SalvarOrcamentoParams = {
  cliente: ClienteInput
  parametros: ParametrosInput
  materiais: {
    madeiras: MaterialInput[]
    materiaisGerais: MaterialInput[]
    telhas: MaterialInput[]
  }
  totais: TotaisInput
  telhaValores: TelhaValoresInput
  links: LinksInput
  titulo: string
  actorUserId: number
  clienteId: number
  /** NOVO — opcional */
  fornecedorId?: number | null
  /** NOVO — opcional (campo na tabela orcamento) */
  observacoes?: string | null
  /** NOVO — cor do stain */
  cor_stain?: string | null
}

export type SalvarRascunhoParams = {
  cliente: ClienteInput
  parametros: ParametrosInput
  materiais: {
    madeiras: MaterialInput[]
    materiaisGerais: MaterialInput[]
    telhas: MaterialInput[]
  }
  totais: TotaisInput
  telhaValores: TelhaValoresInput
  titulo: string
  clienteId: number
  actorUserId: number
  /** NOVO — opcional */
  fornecedorId?: number | null
  /** NOVO — opcional (campo na tabela orcamento) */
  observacoes?: string | null
  /** NOVO — cor do stain */
  cor_stain?: string | null
}

/* ================================================================
 * Helpers internos
 * ================================================================ */

function normalizeMetodoPagamento(m: string): "pix" | "10x" | "18x" {
  if (m === "x10") return "10x"
  if (m === "x18") return "18x"
  return "pix"
}

function cleanText(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ")
}

function cleanTextOrNull(s: string | null | undefined): string | null {
  const t = cleanText(s)
  return t.length ? t : null
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** aceita número ou string com vírgula; retorna number ou null */
function parseTamanho(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const t = v.replace(",", ".")
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/* ================================================================
 * SELECT de chaves estrangeiras
 * ================================================================ */

async function getCidadeIdByNome(tx: any, nome: string): Promise<number | null> {
  const rows = (await tx.$queryRaw`
    SELECT id
    FROM cidades
    WHERE nome = ${nome}
    LIMIT 1
  `) as Array<{ id: number }>
  return rows?.[0]?.id ?? null
}

async function getTipoObraIdByNome(tx: any, tipoObra: string): Promise<number | null> {
  const alvo = (tipoObra ?? "").trim().replace(/\u00A0/g, " ").replace(/\s+/g, " ").toLowerCase()
  const rows = (await tx.$queryRaw`
    SELECT id
    FROM tipo_obra
    WHERE lower(regexp_replace(replace(tipo_obra, chr(160), ' '), '\s+', ' ', 'g')) = ${alvo}
    LIMIT 1
  `) as Array<{ id: number }>
  return rows?.[0]?.id ?? null
}

async function resolveFornecedorId(tx: any, maybeId: unknown): Promise<number | null> {
  const n = Number(maybeId)
  if (!Number.isFinite(n)) return null
  const rows = (await tx.$queryRaw`
    SELECT id
    FROM fornecedores
    WHERE id = ${n}
    LIMIT 1
  `) as Array<{ id: number }>
  return rows?.[0]?.id ?? null
}

/* ================================================================
 * Inserts básicos
 * ================================================================ */

async function insertCliente(
  tx: any,
  data: { nome: string; telefone: string; bairro: string; cidade_id: number | null }
): Promise<number> {
  const rows = (await tx.$queryRaw`
    INSERT INTO cliente (nome, telefone, bairro, cidade_id)
    VALUES (${data.nome}, ${data.telefone}, ${data.bairro}, ${data.cidade_id})
    RETURNING id
  `) as Array<{ id: number }>
  if (!rows?.[0]?.id) throw new Error("Erro ao salvar cliente")
  return rows[0].id
}

async function insertOrcamento(
  tx: any,
  data: {
    cliente_id: number
    tipo_obra_id: number | null
    /** NOVO — opcional */
    id_fornecedor: number | null
    /** NOVO — opcional */
    observacoes: string | null
    /** NOVO — cor do stain */
    cor_stain: string | null
    totais_madeiras_preco: number
    totais_materiais_preco: number
    totais_comissao_preco: number
    totais_empresa_ps_preco: number
    totais_empresa_gd_preco: number
    totais_frete_preco: number
    largura: number | null
    comprimento: number | null
    largura_maior: number | null
    largura_menor: number | null
    comprimento_maior: number | null
    comprimento_menor: number | null
    link_slide: string | null
    link_pdf: string | null
    titulo: string
    created_by: number
    updated_by: number
  }
): Promise<number> {
  const rows = (await tx.$queryRaw`
    INSERT INTO orcamento (
      cliente_id, tipo_obra_id, id_fornecedor, observacoes, cor_stain,
      totais_madeiras_preco, totais_materiais_preco, totais_comissao_preco,
      totais_empresa_ps_preco, totais_empresa_gd_preco, totais_frete_preco,
      largura, comprimento, largura_maior, largura_menor, comprimento_maior, comprimento_menor,
      link_slide, link_pdf, titulo, created_by, updated_by
    ) VALUES (
      ${data.cliente_id}, ${data.tipo_obra_id}, ${data.id_fornecedor}, ${data.observacoes}, ${data.cor_stain},
      ${data.totais_madeiras_preco}, ${data.totais_materiais_preco}, ${data.totais_comissao_preco},
      ${data.totais_empresa_ps_preco}, ${data.totais_empresa_gd_preco}, ${data.totais_frete_preco},
      ${data.largura}, ${data.comprimento}, ${data.largura_maior}, ${data.largura_menor}, ${data.comprimento_maior}, ${data.comprimento_menor},
      ${data.link_slide}, ${data.link_pdf}, ${data.titulo}, ${data.created_by}, ${data.updated_by}
    )
    RETURNING id
  `) as Array<{ id: number }>
  if (!rows?.[0]?.id) throw new Error("Erro ao salvar orçamento")
  return rows[0].id
}

async function insertMaterial(
  tx: any,
  row: {
    orcamento_id: number
    tipo: "madeira" | "geral" | "telha"
    descricao: string
    componente: string | null
    quantidade: number
    preco_unitario: number
    tamanho: number | null
    frete: number
    total: number
  }
) {
  await tx.$executeRaw`
    INSERT INTO orcamento_material (
      orcamento_id, tipo, descricao, componente, quantidade, preco_unitario, tamanho, frete, total
    ) VALUES (
      ${row.orcamento_id}, ${row.tipo}, ${row.descricao}, ${row.componente},
      ${row.quantidade}, ${row.preco_unitario}, ${row.tamanho}, ${row.frete}, ${row.total}
    )
  `
}

async function insertPagamento(
  tx: any,
  row: { orcamento_id: number; tipo_telhas: string; metodo_pagamento: string; valor: number }
) {
  await tx.$executeRaw`
    INSERT INTO orcamento_pagamento (orcamento_id, tipo_telhas, metodo_pagamento, valor)
    VALUES (${row.orcamento_id}, ${row.tipo_telhas}, ${row.metodo_pagamento}, ${row.valor})
  `
}

/* ================================================================
 * Funções principais
 * ================================================================ */

/**
 * Salvar orçamento DEFINITIVO
 */
export async function salvarOrcamentoDB(params: SalvarOrcamentoParams): Promise<number> {
  const tituloLimpo = cleanText(params.titulo)
  const nomeCidade = cleanText(params.cliente.cidade ?? "")
  const observacoesNorm = cleanTextOrNull(params.observacoes)

  return await prisma.$transaction(
    async (tx) => {
      // 1) Título único
      try {
        const dup = (await tx.$queryRaw`
          SELECT id FROM orcamento WHERE titulo = ${tituloLimpo} LIMIT 1
        `) as Array<{ id: number }>
        if (dup?.[0]?.id) {
          throw new AppError("DUPLICATE_TITLE", "Já existe um orçamento com esse título.", "check-duplicate", {
            titulo: tituloLimpo,
          })
        }
      } catch (err: any) {
        if (err instanceof AppError && err.code === "DUPLICATE_TITLE") throw err
        logError("check-duplicate failed", { titulo: tituloLimpo, err: String(err?.message ?? err) })
        throw new AppError("CHECK_DUPLICATE_FAILED", "Erro ao verificar título existente.", "check-duplicate")
      }

      // 2) Cliente (obrigatório)
      const clienteIdPayload = Number((params as any).clienteId)
      if (!Number.isFinite(clienteIdPayload)) {
        throw new AppError("CLIENT_ID_REQUIRED", "Selecione ou cadastre um cliente antes de salvar.", "resolve-cliente")
      }

      const chkCliente = (await tx.$queryRaw`
        SELECT id FROM cliente WHERE id = ${clienteIdPayload} LIMIT 1
      `) as Array<{ id: number }>
      const clienteId = chkCliente?.[0]?.id ?? null
      if (!clienteId) {
        throw new AppError("CLIENT_NOT_FOUND", "Cliente não encontrado.", "resolve-cliente", {
          clienteId: clienteIdPayload,
        })
      }

      // 3) Tipo de obra (obrigatório)
      const tipoObraIdPayload = Number((params.parametros as any)?.tipoObraId)
      let tipoObraId: number | null = null
      if (Number.isFinite(tipoObraIdPayload)) {
        const chk = (await tx.$queryRaw`
          SELECT id FROM tipo_obra WHERE id = ${tipoObraIdPayload} LIMIT 1
        `) as Array<{ id: number }>
        tipoObraId = chk?.[0]?.id ?? null
      }
      if (!tipoObraId) {
        const tipoObraNome = cleanText(params.parametros.tipoObra ?? "")
        if (!tipoObraNome) throw new AppError("TYPE_NOT_FOUND", "Tipo de obra não encontrado", "resolve-tipo")
        tipoObraId = await getTipoObraIdByNome(tx, tipoObraNome)
        if (!tipoObraId)
          throw new AppError("TYPE_NOT_FOUND", "Tipo de obra não encontrado", "resolve-tipo", { tipoObraNome })
      }

      // 4) Fornecedor (opcional e silencioso)
      const id_fornecedor = await resolveFornecedorId(tx, (params as any).fornecedorId)

      // 5) Orçamento (links obrigatórios)
      let orcamentoId: number
      try {
        orcamentoId = await insertOrcamento(tx, {
          cliente_id: clienteId,
          tipo_obra_id: tipoObraId,
          id_fornecedor,
          observacoes: observacoesNorm,
          cor_stain: cleanTextOrNull(params.cor_stain),
          totais_madeiras_preco: num(params.totais.madeiras),
          totais_materiais_preco: num(params.totais.materiais),
          totais_comissao_preco: num(params.totais.comissao),
          totais_empresa_ps_preco: num(params.totais.empresaPS),
          totais_empresa_gd_preco: num(params.totais.empresaGD),
          totais_frete_preco: num(params.totais.frete),
          largura: params.parametros.largura ?? null,
          comprimento: params.parametros.comprimento ?? null,
          largura_maior: params.parametros.larguraMaior ?? null,
          largura_menor: params.parametros.larguraMenor ?? null,
          comprimento_maior: params.parametros.comprimentoMaior ?? null,
          comprimento_menor: params.parametros.comprimentoMenor ?? null,
          link_slide: params.links.slideUrl,
          link_pdf: params.links.pdfUrl,
          titulo: tituloLimpo,
          created_by: params.actorUserId,
          updated_by: params.actorUserId,
        })
      } catch (err: any) {
        logError("insert-orcamento failed", {
          titulo: tituloLimpo,
          clienteId,
          tipoObraId,
          id_fornecedor,
          err: String(err?.message ?? err),
        })
        throw new AppError("INSERT_ORCAMENTO_FAILED", "Erro ao salvar orçamento", "insert-orcamento")
      }

      // 6) Materiais
      const mats = params.materiais

      for (const m of mats.madeiras ?? []) {
        const tamanho = parseTamanho(m.tamanho)
        const quantidade = num(m.quantidade)
        const preco = num(m.preco)
        const total = tamanho ? tamanho * quantidade * preco : 0
        try {
          await insertMaterial(tx, {
            orcamento_id: orcamentoId,
            tipo: "madeira",
            descricao: cleanText(m.nome),
            componente: cleanText(m.componente ?? "") || null,
            quantidade,
            preco_unitario: preco,
            tamanho,
            frete: 0,
            total,
          })
        } catch (err: any) {
          logError("insert-material failed", { tipo: "madeira", err: String(err?.message ?? err), material: m })
          throw new AppError("INSERT_MATERIAL_FAILED", "Erro ao inserir material (madeira).", "insert-material", {
            tipo: "madeira",
          })
        }
      }

      for (const m of mats.materiaisGerais ?? []) {
        const quantidade = num(m.quantidade)
        const preco = num(m.preco)
        const total = quantidade * preco
        try {
          await insertMaterial(tx, {
            orcamento_id: orcamentoId,
            tipo: "geral",
            descricao: cleanText(m.nome),
            componente: "",
            quantidade,
            preco_unitario: preco,
            tamanho: null,
            frete: 0,
            total,
          })
        } catch (err: any) {
          logError("insert-material failed", {
            tipo: "geral",
            err: String(err?.message ?? err),
            row: {
              descricao: cleanText(m.nome),
              quantidade,
              preco_unitario: preco,
              frete: 0,
              total,
              tamanho: null,
              componente: "",
            },
          })
          throw new AppError("INSERT_MATERIAL_FAILED", "Erro ao inserir material (geral).", "insert-material", {
            tipo: "geral",
            descricao: cleanText(m.nome),
            quantidade,
            preco_unitario: preco,
            frete: 0,
            total,
            dbMessage: String(err?.message ?? ""),
          })
        }
      }

      for (const m of mats.telhas ?? []) {
        const quantidade = num(m.quantidade)
        const preco = num(m.preco)
        const freteV = num(m.frete)
        const total = quantidade * preco + freteV
        try {
          await insertMaterial(tx, {
            orcamento_id: orcamentoId,
            tipo: "telha",
            descricao: cleanText(m.nome),
            componente: "",
            quantidade,
            preco_unitario: preco,
            tamanho: null,
            frete: freteV,
            total,
          })
        } catch (err: any) {
          logError("insert-material failed", {
            tipo: "telha",
            err: String(err?.message ?? err),
            row: {
              descricao: cleanText(m.nome),
              quantidade,
              preco_unitario: preco,
              frete: freteV,
              total,
              tamanho: null,
            },
          })
          throw new AppError("INSERT_MATERIAL_FAILED", "Erro ao inserir material (telha).", "insert-material", {
            tipo: "telha",
            descricao: cleanText(m.nome),
            quantidade,
            preco_unitario: preco,
            frete: freteV,
            total,
            dbMessage: String(err?.message ?? ""),
          })
        }
      }

      // 7) Pagamentos
      for (const [tipoTelha, valores] of Object.entries(params.telhaValores ?? {})) {
        const t = cleanText(tipoTelha)
        if (!t) continue
        const vPix = num(valores?.pix)
        const v10 = num(valores?.x10)
        const v18 = num(valores?.x18)
        try {
          await insertPagamento(tx, { orcamento_id: orcamentoId, tipo_telhas: t, metodo_pagamento: "pix", valor: vPix })
          await insertPagamento(tx, { orcamento_id: orcamentoId, tipo_telhas: t, metodo_pagamento: "10x", valor: v10 })
          await insertPagamento(tx, { orcamento_id: orcamentoId, tipo_telhas: t, metodo_pagamento: "18x", valor: v18 })
        } catch {
          throw new AppError("INSERT_PAGAMENTO_FAILED", "Erro ao inserir pagamento.", "insert-pagamento")
        }
      }

      return orcamentoId
    },
    {
      timeout: 120_000,
      maxWait: 20_000,
    }
  )
}

/**
 * Salvar RASCUNHO de orçamento
 */
export async function salvarRascunhoOrcamentoDB(params: SalvarRascunhoParams): Promise<number> {
  const tituloLimpo = cleanText(params.titulo)
  const nomeCidade = cleanText(params.cliente.cidade ?? "")
  const observacoesNorm = cleanTextOrNull(params.observacoes)

  return await prisma.$transaction(
    async (tx) => {
      // 1) Cliente (obrigatório)
      const clienteIdPayload = Number((params as any).clienteId)
      if (!Number.isFinite(clienteIdPayload)) {
        throw new AppError("CLIENT_ID_REQUIRED", "Falha ao salvar rascunho: selecione um cliente.", "resolve-cliente")
      }

      const chkCliente = (await tx.$queryRaw`
        SELECT id FROM cliente WHERE id = ${clienteIdPayload} LIMIT 1
      `) as Array<{ id: number }>
      const clienteId = chkCliente?.[0]?.id ?? null
      if (!clienteId) {
        throw new AppError("CLIENT_NOT_FOUND", "Falha ao salvar rascunho: cliente não encontrado.", "resolve-cliente", {
          clienteId: clienteIdPayload,
        })
      }

      // 2) Título duplicado (se vier)
      try {
        const dup = (await tx.$queryRaw`
          SELECT id FROM orcamento WHERE titulo = ${tituloLimpo} LIMIT 1
        `) as Array<{ id: number }>
        if (dup?.[0]?.id) {
          throw new AppError("DUPLICATE_TITLE", "Falha ao salvar rascunho: título já existe.", "check-duplicate", {
            titulo: tituloLimpo,
          })
        }
      } catch (err: any) {
        if (err instanceof AppError && err.code === "DUPLICATE_TITLE") throw err
        logError("check-duplicate failed", { titulo: tituloLimpo, err: String(err?.message ?? err) })
        throw new AppError("CHECK_DUPLICATE_FAILED", "Falha ao salvar rascunho: erro ao verificar título.", "check-duplicate")
      }

      // 3) Tipo de obra (opcional)
      const tipoObraNome = cleanText(params.parametros.tipoObra ?? "")
      const tipoObraId = tipoObraNome ? await getTipoObraIdByNome(tx, tipoObraNome) : null

      // 4) Fornecedor (opcional e silencioso)
      const id_fornecedor = await resolveFornecedorId(tx, (params as any).fornecedorId)

      // 5) Orçamento (links null)
      let orcamentoId: number
      try {
        orcamentoId = await insertOrcamento(tx, {
          cliente_id: clienteId,
          tipo_obra_id: tipoObraId ?? null,
          id_fornecedor,
          observacoes: observacoesNorm,
          cor_stain: cleanTextOrNull(params.cor_stain),
          totais_madeiras_preco: num(params.totais.madeiras),
          totais_materiais_preco: num(params.totais.materiais),
          totais_comissao_preco: num(params.totais.comissao),
          totais_empresa_ps_preco: num(params.totais.empresaPS),
          totais_empresa_gd_preco: num(params.totais.empresaGD),
          totais_frete_preco: num(params.totais.frete),
          largura: params.parametros.largura ?? null,
          comprimento: params.parametros.comprimento ?? null,
          largura_maior: params.parametros.larguraMaior ?? null,
          largura_menor: params.parametros.larguraMenor ?? null,
          comprimento_maior: params.parametros.comprimentoMaior ?? null,
          comprimento_menor: params.parametros.comprimentoMenor ?? null,
          link_slide: null,
          link_pdf: null,
          titulo: tituloLimpo,
          created_by: params.actorUserId,
          updated_by: params.actorUserId,
        })
      } catch (err: any) {
        logError("insert-orcamento failed", {
          titulo: tituloLimpo,
          clienteId,
          tipoObraId: null,
          id_fornecedor,
          err: String(err?.message ?? err),
        })
        throw new AppError("INSERT_ORCAMENTO_FAILED", "Falha ao salvar rascunho.", "insert-orcamento")
      }

      // 6) Materiais (se houver)
      const mats = params.materiais

      for (const m of mats.madeiras ?? []) {
        const tamanho = parseTamanho(m.tamanho)
        const quantidade = num(m.quantidade)
        const preco = num(m.preco)
        const total = tamanho ? tamanho * quantidade * preco : 0
        try {
          await insertMaterial(tx, {
            orcamento_id: orcamentoId,
            tipo: "madeira",
            descricao: cleanText(m.nome),
            componente: cleanText(m.componente ?? "") || null,
            quantidade,
            preco_unitario: preco,
            tamanho,
            frete: 0,
            total,
          })
        } catch (err: any) {
          logError("insert-material failed", { tipo: "madeira", err: String(err?.message ?? err), material: m })
          throw new AppError("INSERT_MATERIAL_FAILED", "Falha ao salvar rascunho (madeira).", "insert-material", {
            tipo: "madeira",
          })
        }
      }

      for (const m of mats.materiaisGerais ?? []) {
        const quantidade = num(m.quantidade)
        const preco = num(m.preco)
        const total = quantidade * preco
        try {
          await insertMaterial(tx, {
            orcamento_id: orcamentoId,
            tipo: "geral",
            descricao: cleanText(m.nome),
            componente: "",
            quantidade,
            preco_unitario: preco,
            tamanho: null,
            frete: 0,
            total,
          })
        } catch (err: any) {
          logError("insert-material failed", { tipo: "geral", err: String(err?.message ?? err), material: m })
          throw new AppError("INSERT_MATERIAL_FAILED", "Falha ao salvar rascunho (material geral).", "insert-material", {
            tipo: "geral",
          })
        }
      }

      for (const m of mats.telhas ?? []) {
        const quantidade = num(m.quantidade)
        const preco = num(m.preco)
        const freteV = num(m.frete)
        const total = quantidade * preco + freteV
        try {
          await insertMaterial(tx, {
            orcamento_id: orcamentoId,
            tipo: "telha",
            descricao: cleanText(m.nome),
            componente: "",
            quantidade,
            preco_unitario: preco,
            tamanho: null,
            frete: freteV,
            total,
          })
        } catch (err: any) {
          logError("insert-material failed", {
            tipo: "telha",
            err: String(err?.message ?? err),
            row: {
              descricao: cleanText(m.nome),
              quantidade,
              preco_unitario: preco,
              frete: freteV,
              total,
              tamanho: null,
            },
          })
          throw new AppError("INSERT_MATERIAL_FAILED", "Falha ao salvar rascunho (telha).", "insert-material", {
            tipo: "telha",
            descricao: cleanText(m.nome),
            quantidade,
            preco_unitario: preco,
            frete: freteV,
            total,
            dbMessage: String(err?.message ?? ""),
          })
        }
      }

      // 7) Pagamentos (apenas se > 0)
      for (const [tipoTelha, valores] of Object.entries(params.telhaValores ?? {})) {
        const t = cleanText(tipoTelha)
        if (!t) continue

        const vPix = num(valores?.pix)
        const v10 = num(valores?.x10)
        const v18 = num(valores?.x18)

        if (vPix > 0 || v10 > 0 || v18 > 0) {
          try {
            await insertPagamento(tx, { orcamento_id: orcamentoId, tipo_telhas: t, metodo_pagamento: "pix", valor: vPix })
            await insertPagamento(tx, { orcamento_id: orcamentoId, tipo_telhas: t, metodo_pagamento: "10x", valor: v10 })
            await insertPagamento(tx, { orcamento_id: orcamentoId, tipo_telhas: t, metodo_pagamento: "18x", valor: v18 })
          } catch {
            throw new AppError("INSERT_PAGAMENTO_FAILED", "Falha ao salvar rascunho (pagamentos).", "insert-pagamento")
          }
        }
      }

      return orcamentoId
    },
    {
      timeout: 120_000,
      maxWait: 20_000,
    }
  )
}
