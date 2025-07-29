// src/hooks/useGerarPDF.ts
import type { Material } from "../app/gerar-orcamento/page"

export type MateriaisPorCategoria = {
  madeiras: Material[]
  materiaisGerais: Material[]
  telhas: Material[]
}

export type Totais = {
  madeiras: number
  materiais: number
  comissao: number
  empresaPS: number
  empresaGD: number
}

export type TelhaPixValores = Record<
  "Romana" | "Colonial" | "Americana",
  { pix: number }
>

export interface GerarPDFParams {
  cliente: {
    nome: string
    telefone: string
    cidade: string
    bairro: string
  }
  parametros: {
    tipoObra: string
    largura: number
    comprimento: number
  }
  materiais: MateriaisPorCategoria
  totais: Totais
  telhaValores: TelhaPixValores
}

const toNum = (s?: string | number): number => {
  if (typeof s === "number") return s > 0 ? s : 0
  if (!s) return 0
  const n = parseFloat(String(s).replace(",", "."))
  return isNaN(n) || n < 0 ? 0 : n
}

export async function gerarPDF(params: GerarPDFParams): Promise<void> {
  const { cliente, parametros, materiais, totais, telhaValores } = params

  const payload = {
    cliente,
    parametros,
    madeiras: materiais.madeiras.map(m => ({
      componente: m.componente,
      madeira: m.nome,
      tamanho: m.tamanho,
      quantidade: m.quantidade,
      preco_m2: m.preco,
      total: toNum(m.tamanho) * m.quantidade * m.preco,
    })),
    materiaisGerais: materiais.materiaisGerais.map(m => ({
      descricao: m.nome,
      quantidade: m.quantidade,
      preco_unitario: m.preco,
      total: m.quantidade * m.preco,
    })),
    telhas: materiais.telhas.map(m => ({
      descricao: m.nome,
      quantidade: m.quantidade,
      preco_unitario: m.preco,
      frete: m.frete ?? 0,
      total: m.quantidade * m.preco + (m.frete ?? 0),
    })),
    totais: {
      madeiras: totais.madeiras,
      materiaisGerais: totais.materiais,
      comissao: totais.comissao,
      empresaPS: totais.empresaPS,
      empresaGD: totais.empresaGD,
    },
    telhasValoresFixos: {
      Romana: telhaValores.Romana.pix,
      Colonial: telhaValores.Colonial.pix,
      Americana: telhaValores.Americana.pix,
    },
  }

  console.log("[DEBUG] Payload enviado para geração de PDF:", payload)
}
