// src/hooks/useGerarPDF.ts
import axios from "axios"
import type { Material } from "@/app/gerar-orcamento/page"

/* ---------- Tipos auxiliares ---------- */
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
  { pix: number; x10: number; x18: number }
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

/* ---------- Helpers ---------- */
/** Converte string/number para number não-negativo */
const toNum = (s?: string | number): number => {
  if (typeof s === "number") return s > 0 ? s : 0
  if (!s) return 0
  const n = parseFloat(String(s).replace(",", "."))
  return isNaN(n) || n < 0 ? 0 : n
}

/** Arredonda para cima (2 casas) e troca ponto por vírgula */
const fmt = (n: number) =>
  (Math.ceil(n * 100) / 100).toFixed(2).replace(".", ",")

/* ---------- Função principal ---------- */
export async function gerarPDF(params: GerarPDFParams) {
  const { cliente, parametros, materiais, totais, telhaValores } = params

  const payload = {
    cliente,
    parametros,
    madeiras: materiais.madeiras.map(m => ({
      componente : m.componente,
      madeira    : m.nome,
      tamanho    : fmt(toNum(m.tamanho)),
      quantidade : fmt(m.quantidade),
      preco_m2   : fmt(m.preco),
      total      : fmt(toNum(m.tamanho) * m.quantidade * m.preco),
    })),
    materiaisGerais: materiais.materiaisGerais.map(m => ({
      descricao      : m.nome,
      quantidade     : fmt(m.quantidade),
      preco_unitario : fmt(m.preco),
      total          : fmt(m.quantidade * m.preco),
    })),
    telhas: materiais.telhas.map(m => ({
      descricao      : m.nome,
      quantidade     : fmt(m.quantidade),
      preco_unitario : fmt(m.preco),
      frete          : fmt(m.frete ?? 0),
      total          : fmt(m.quantidade * m.preco + (m.frete ?? 0)),
    })),
    totais: {
      madeiras       : fmt(totais.madeiras),
      materiaisGerais: fmt(totais.materiais),
      comissao       : fmt(totais.comissao),
      empresaPS      : fmt(totais.empresaPS),
      empresaGD      : fmt(totais.empresaGD),
    },
    telhasValoresFixos: {
      Romana: {
        pix: fmt(telhaValores.Romana.pix),
        x10: fmt(telhaValores.Romana.x10),
        x18: fmt(telhaValores.Romana.x18),
      },
      Colonial: {
        pix: fmt(telhaValores.Colonial.pix),
        x10: fmt(telhaValores.Colonial.x10),
        x18: fmt(telhaValores.Colonial.x18),
      },
      Americana: {
        pix: fmt(telhaValores.Americana.pix),
        x10: fmt(telhaValores.Americana.x10),
        x18: fmt(telhaValores.Americana.x18),
      },
    },
  }

  // log de depuração
  console.log("[DEBUG] Payload enviado:", payload)

  // POST para o webhook n8n
  const { data } = await axios.post(
    "https://n8n.revstack.com.br/webhook/gd",
    payload,
    { headers: { "Content-Type": "application/json" }, timeout: 15000 },
  )

  console.log("[DEBUG] Resposta n8n:", data)
  return data // (link_pdf, mensagem, etc.)
}
