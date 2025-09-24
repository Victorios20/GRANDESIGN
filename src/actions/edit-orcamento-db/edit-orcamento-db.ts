// src/actions/edit-orcamento-db/edit-orcamento-db.ts
import { prisma } from "@/lib/prisma"

/* ========================= Helpers e Tipos ========================= */

type UIInteger = number // id efêmero para a UI (não é id do BD)

export type UIMaterial = {
  id: UIInteger
  nome: string
  componente: string | null
  quantidade: number
  preco: number
  tamanho?: number | null
  frete?: number | null
}

export type GetOrcamentoResult = {
  id: number
  titulo: string
  clienteId: number 
  cliente: {
    nome: string
    telefone: string
    bairro: string
    cidade: string | null // por nome
  }
  parametros: {
    tipoObra: string | null // por nome
    largura: number | null
    comprimento: number | null
    larguraMaior: number | null
    larguraMenor: number | null
    comprimentoMaior: number | null
    comprimentoMenor: number | null
  }
  materiais: {
    madeiras: UIMaterial[]
    materiaisGerais: UIMaterial[]
    telhas: UIMaterial[]
  }
  totais: {
    madeiras: number
    materiais: number
    comissao: number
    frete: number
    empresaPS: number
    empresaGD: number
  }
  links: {
    slideUrl: string | null
    pdfUrl: string | null
  }
  // dinâmico: chaves = nomes das telhas
  telhaValores: Record<string, { pix: number; x10: number; x18: number }>
}

export type UpdateOrcamentoInput = {
  titulo: string
  cliente: { nome: string; telefone: string; bairro: string; cidade: string | null } // cidade por nome
  parametros: {
    tipoObraId?: number | null
    tipoObra: string | null
    largura?: number | string | null
    comprimento?: number | string | null
    larguraMaior?: number | string | null
    larguraMenor?: number | string | null
    comprimentoMaior?: number | string | null
    comprimentoMenor?: number | string | null
  }
  materiais: {
    madeiras: Array<{
      id?: UIInteger
      nome: string
      componente?: string | null
      quantidade: number | string
      preco: number | string
      tamanho?: number | string | null
    }>
    materiaisGerais: Array<{
      id?: UIInteger
      nome: string
      quantidade: number | string
      preco: number | string
    }>
    telhas: Array<{
      id?: UIInteger
      nome: string
      quantidade: number | string
      preco: number | string
      frete?: number | string | null
    }>
  }
  totais: {
    madeiras: number | string
    materiais: number | string
    comissao: number | string
    frete: number | string
    empresaPS: number | string
    empresaGD: number | string
  }
  links: { slideUrl: string | null; pdfUrl: string | null }
  // dinâmico (qualquer descrição de telha)
  telhaValores: Record<string, { pix: number | string; x10: number | string; x18: number | string }>
}

/* ------------------------- utilidades numéricas ------------------------- */

function cleanText(s: string | null | undefined) {
  return (s ?? "").toString().trim().replace(/\s+/g, " ")
}
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === "object") {
    const anyV = v as any
    if (typeof anyV?.toNumber === "function") {
      const n = anyV.toNumber()
      return Number.isFinite(n) ? n : null
    }
    const val = anyV?.valueOf?.() ?? anyV
    if (typeof val === "number") return Number.isFinite(val) ? val : null
    if (typeof val === "string") {
      const n = Number(val.replace?.(",", ".") ?? val)
      return Number.isFinite(n) ? n : null
    }
  }
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function nonNeg(v: unknown): number {
  const n = toNumber(v)
  if (n === null || !Number.isFinite(n)) return 0
  return n < 0 ? 0 : n
}



// id efêmero só para keys da UI
function ephemeralId(seed = 0) {
  return (Date.now() & 0xfffffff) + Math.floor(Math.random() * 1000) + seed
}

// normaliza método de pagamento para persistência
function normalizeMetodoPagamento(m: string): "pix" | "10x" | "18x" {
  const mm = m.toLowerCase()
  if (mm === "x10" || mm === "10x") return "10x"
  if (mm === "x18" || mm === "18x") return "18x"
  return "pix"
}

// para reconstruir telhaValores no GET com as chaves que a UI espera (pix/x10/x18)
function uiMetodoKey(metodoPersistido: string): "pix" | "x10" | "x18" | null {
  const mm = metodoPersistido.toLowerCase()
  if (mm === "pix") return "pix"
  if (mm === "10x" || mm === "x10") return "x10"
  if (mm === "18x" || mm === "x18") return "x18"
  return null
}

/* ========================= GET (carregar para edição) ========================= */

export async function getOrcamentoById(id: number): Promise<GetOrcamentoResult> {
  try {
    const data = await prisma.$transaction(
      async (tx) => {
        const orc = await tx.orcamento.findUnique({
          where: { id },
          include: {
            cliente: {
              include: {
                // era "cidade: true" → CORRETO:
                cidades: true,
              },
            },
            // mantém:
            tipo_obra: true,
          },
        })

        if (!orc) throw new Error("Orçamento não encontrado.")

        // materiais
        const mats = await tx.orcamento_material.findMany({
          where: { orcamento_id: id },
          orderBy: { id: "asc" },
        })

        // pagamentos (dinâmico por telha)
        const pays = await tx.orcamento_pagamento.findMany({
          where: { orcamento_id: id },
          orderBy: [{ tipo_telhas: "asc" }, { metodo_pagamento: "asc" }],
        })

        return { orc, mats, pays }
      },
      { timeout: 120_000, maxWait: 20_000 }
    )

    const madeiras: UIMaterial[] = []
    const gerais: UIMaterial[] = []
    const telhas: UIMaterial[] = []

    data.mats.forEach((m, idx) => {
      const base = {
        id: ephemeralId(idx),
        nome: m.descricao ?? "",
        componente: (m.componente ?? "") || null,
        quantidade: nonNeg(m.quantidade),
        preco: nonNeg(m.preco_unitario),
      }

      if (m.tipo === "madeira") {
        madeiras.push({
          ...base,
          tamanho: toNumber(m.tamanho) ?? null,
          frete: 0,
        })
      } else if (m.tipo === "geral") {
        gerais.push({
          ...base,
          tamanho: null,
          frete: 0,
        })
      } else {
        // telha
        telhas.push({
          ...base,
          tamanho: null,
          frete: toNumber(m.frete) ?? 0,
        })
      }
    })

    // reconstruir telhaValores a partir dos pagamentos (por tipo_telhas)
    // reconstruir telhaValores a partir dos pagamentos (por tipo_telhas) + UNIÃO com materiais (Etapa 2)
    const telhaValores: GetOrcamentoResult["telhaValores"] = {}

    // 1) Pivot dos pagamentos → { [tipoTelha]: { pix, x10, x18 } }
    for (const p of data.pays) {
      const key = cleanText(p.tipo_telhas) || "Telha"
      const uiKey = uiMetodoKey(p.metodo_pagamento)
      if (!uiKey) continue
      if (!telhaValores[key]) telhaValores[key] = { pix: 0, x10: 0, x18: 0 }
      telhaValores[key][uiKey] += nonNeg(p.valor)
    }

    // 2) UNIÃO com os nomes usados na Etapa 2 (materiais tipo "telha")
    //    -> garante que telhas sem pagamento ainda apareçam com {0,0,0}
    for (const m of data.mats) {
      if (m.tipo === "telha") {
        const nome = cleanText(m.descricao)
        if (nome && !telhaValores[nome]) {
          telhaValores[nome] = { pix: 0, x10: 0, x18: 0 }
        }
      }
    }


    const res: GetOrcamentoResult = {
      id,
      titulo: data.orc.titulo ?? "",
      clienteId: data.orc.cliente_id ?? 0,
      cliente: {
        nome: data.orc.cliente.nome ?? "",
        telefone: data.orc.cliente.telefone ?? "",
        bairro: data.orc.cliente.bairro ?? "",
        cidade: data.orc.cliente.cidades?.nome ?? null,
      },
      parametros: {
        tipoObra: data.orc.tipo_obra?.tipo_obra ?? null,
        largura: toNumber(data.orc.largura),
        comprimento: toNumber(data.orc.comprimento),
        larguraMaior: toNumber(data.orc.largura_maior),
        larguraMenor: toNumber(data.orc.largura_menor),
        comprimentoMaior: toNumber(data.orc.comprimento_maior),
        comprimentoMenor: toNumber(data.orc.comprimento_menor),
      },
      materiais: {
        madeiras,
        materiaisGerais: gerais,
        telhas,
      },
      totais: {
        madeiras: nonNeg(data.orc.totais_madeiras_preco),
        materiais: nonNeg(data.orc.totais_materiais_preco),
        comissao: nonNeg(data.orc.totais_comissao_preco),
        frete: nonNeg(data.orc.totais_frete_preco),
        empresaPS: nonNeg(data.orc.totais_empresa_ps_preco),
        empresaGD: nonNeg(data.orc.totais_empresa_gd_preco),
      },
      links: {
        slideUrl: data.orc.link_slide ?? null,
        pdfUrl: data.orc.link_pdf ?? null,
      },
      telhaValores, // pode ser {}
    }

    return res
  } catch (err: any) {
    // mantém mensagem existente
    if (typeof err?.message === "string") {
      if (err.message.includes("Orçamento não encontrado")) throw err
    }
    throw new Error("Não foi possível carregar o orçamento.")
  }
}

/* ========================= UPDATE (editar orçamento) ========================= */

export async function updateOrcamento(id: number, input: UpdateOrcamentoInput): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // 1) Checar existência e obter cliente_id
      const atual = await tx.orcamento.findUnique({
        where: { id },
        select: { id: true, cliente_id: true },
      })
      if (!atual) throw new Error("Orçamento não encontrado.")



      // 3) Resolver tipo de obra (aceita id ou nome)
      let tipoObraId: number | null = null
      const tipoObraIdPayload = Number((input.parametros as any)?.tipoObraId)
      if (Number.isFinite(tipoObraIdPayload)) {
        const chk = (await tx.$queryRaw`SELECT id FROM tipo_obra WHERE id = ${tipoObraIdPayload} LIMIT 1`) as Array<{ id: number }>
        tipoObraId = chk?.[0]?.id ?? null
      }
      if (!tipoObraId) {
        const tipoObraNome = cleanText(input.parametros.tipoObra)
        if (tipoObraNome) {
          const alvo = tipoObraNome.trim().replace(/\u00A0/g, " ").replace(/\s+/g, " ").toLowerCase()
          const row = (await tx.$queryRaw`
      SELECT id
      FROM tipo_obra
      WHERE lower(regexp_replace(replace(tipo_obra, chr(160), ' '), '\s+', ' ', 'g')) = ${alvo}
      LIMIT 1
    `) as Array<{ id: number }>
          if (!row?.[0]?.id) throw new Error("Tipo de obra não encontrado.")
          tipoObraId = row[0].id
        }
      }

      // 5) Atualizar orçamento (dimensões só se !== undefined)
      const dimUpdate: Record<string, number | null | undefined> = {}
      const {
        largura,
        comprimento,
        larguraMaior,
        larguraMenor,
        comprimentoMaior,
        comprimentoMenor,
      } = input.parametros

      if (largura !== undefined) dimUpdate.largura = toNumber(largura)
      if (comprimento !== undefined) dimUpdate.comprimento = toNumber(comprimento)
      if (larguraMaior !== undefined) dimUpdate.largura_maior = toNumber(larguraMaior)
      if (larguraMenor !== undefined) dimUpdate.largura_menor = toNumber(larguraMenor)
      if (comprimentoMaior !== undefined) dimUpdate.comprimento_maior = toNumber(comprimentoMaior)
      if (comprimentoMenor !== undefined) dimUpdate.comprimento_menor = toNumber(comprimentoMenor)

      try {
        await tx.orcamento.update({
          where: { id },
          data: {
            titulo: cleanText(input.titulo),
            tipo_obra_id: tipoObraId,
            totais_madeiras_preco: nonNeg(input.totais.madeiras),
            totais_materiais_preco: nonNeg(input.totais.materiais),
            totais_comissao_preco: nonNeg(input.totais.comissao),
            totais_empresa_ps_preco: nonNeg(input.totais.empresaPS),
            totais_empresa_gd_preco: nonNeg(input.totais.empresaGD),
            totais_frete_preco: nonNeg(input.totais.frete),
            link_slide: input.links.slideUrl ?? null,
            link_pdf: input.links.pdfUrl ?? null,
            ...dimUpdate
          },
        })
      } catch {

        throw new Error("Erro ao atualizar orçamento.")
      }

      // 6) Materiais: delete → createMany (madeira, geral, telha)
      try {
        await tx.orcamento_material.deleteMany({ where: { orcamento_id: id } })
      } catch {
        throw new Error("Erro ao limpar materiais.")
      }

      const matsToCreate: Array<{
        orcamento_id: number
        tipo: "madeira" | "geral" | "telha"
        descricao: string
        componente: string | null
        quantidade: number
        preco_unitario: number
        tamanho: number | null
        frete: number
        total: number
      }> = []

      // madeiras
      for (const m of input.materiais.madeiras ?? []) {
        const quantidade = nonNeg(m.quantidade)
        const preco = nonNeg(m.preco)
        const tamanho = toNumber(m.tamanho) ?? 0
        const total = quantidade * preco * tamanho
        matsToCreate.push({
          orcamento_id: id,
          tipo: "madeira",
          descricao: cleanText(m.nome),
          componente: cleanText(m.componente ?? "") || "",
          quantidade,
          preco_unitario: preco,
          tamanho,
          frete: 0,
          total,
        })
      }

      // materiais gerais
      for (const m of input.materiais.materiaisGerais ?? []) {
        const quantidade = nonNeg(m.quantidade)
        const preco = nonNeg(m.preco)
        const total = quantidade * preco
        matsToCreate.push({
          orcamento_id: id,
          tipo: "geral",
          descricao: cleanText(m.nome),
          componente: null, // mantém comportamento do arquivo original
          quantidade,
          preco_unitario: preco,
          tamanho: null,
          frete: 0,
          total,
        })
      }

      // telhas (dinâmico; detalhe no nome/descrição)
      for (const m of input.materiais.telhas ?? []) {
        const quantidade = nonNeg(m.quantidade)
        const preco = nonNeg(m.preco)
        const frete = nonNeg(m.frete)
        const total = quantidade * preco + frete
        matsToCreate.push({
          orcamento_id: id,
          tipo: "telha",
          descricao: cleanText(m.nome),
          componente: null,
          quantidade,
          preco_unitario: preco,
          tamanho: null,
          frete,
          total,
        })
      }

      try {
        if (matsToCreate.length > 0) {
          await tx.orcamento_material.createMany({ data: matsToCreate })
        }
      } catch {
        throw new Error("Erro ao salvar materiais.")
      }

      // 7) Pagamentos (dinâmico por telha): delete → createMany
      try {
        await tx.orcamento_pagamento.deleteMany({ where: { orcamento_id: id } })
      } catch {
        throw new Error("Erro ao limpar pagamentos.")
      }

      const paysToCreate: Array<{
        orcamento_id: number
        tipo_telhas: string
        metodo_pagamento: "pix" | "10x" | "18x"
        valor: number
      }> = []

      for (const [tipoTelhaBruto, valores] of Object.entries(input.telhaValores ?? {})) {
        const tipoTelha = cleanText(tipoTelhaBruto)
        if (!tipoTelha) continue // ignora chave vazia
        // sempre 3 métodos no UPDATE (paridade com comportamento atual)
        paysToCreate.push({
          orcamento_id: id,
          tipo_telhas: tipoTelha,
          metodo_pagamento: normalizeMetodoPagamento("pix"),
          valor: nonNeg(valores?.pix),
        })
        paysToCreate.push({
          orcamento_id: id,
          tipo_telhas: tipoTelha,
          metodo_pagamento: normalizeMetodoPagamento("x10"),
          valor: nonNeg(valores?.x10),
        })
        paysToCreate.push({
          orcamento_id: id,
          tipo_telhas: tipoTelha,
          metodo_pagamento: normalizeMetodoPagamento("x18"),
          valor: nonNeg(valores?.x18),
        })
      }

      try {
        if (paysToCreate.length > 0) {
          await tx.orcamento_pagamento.createMany({ data: paysToCreate })
        }
      } catch {
        throw new Error("Erro ao salvar pagamentos.")
      }
    },
    { timeout: 120_000, maxWait: 20_000 }
  )
}
