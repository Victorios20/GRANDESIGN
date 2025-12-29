import type { MaterialCalculado } from "../calcular-materiais/calcularMateriais"

export interface TotaisCalculados {
  maoDeObra: number
  empresaGD: number
}

type Item = {
  componente?: string | null
  quantidade?: number | null
  preco_unitario?: number | null
  preco?: number | null
  tamanho?: string | number | null
  frete?: number | null
}

export interface ParametrosTotais {
  madeiras: (MaterialCalculado | Item)[]
  materiais: (MaterialCalculado | Item)[]
  telhas: (MaterialCalculado | Item)[]
}

const toPos = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? Math.max(0, v) : 0
  if (v == null) return 0
  const n = Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

const getPreco = (m: Item) =>
  toPos((m as any)?.preco_unitario ?? (m as any)?.preco ?? 0)

export function calcularTotais({
  madeiras = [],
  materiais = [],
  telhas = [],
}: Partial<ParametrosTotais> = {}): TotaisCalculados {
  const arrMadeiras = Array.isArray(madeiras) ? madeiras : []
  const arrMateriais = Array.isArray(materiais) ? materiais : []
  const arrTelhas = Array.isArray(telhas) ? telhas : []

  const maoDeObra = calcularMaoDeObra(arrMadeiras as Item[])

  const {
    totalMadeiras,
    totalMateriais,
    telhaMaxTotal,
    valorTotalMateriais,
  } = calcularValorTotalMateriais(
    arrMadeiras as Item[],
    arrMateriais as Item[],
    arrTelhas as Item[]
  )

  const empresaGDBase = (valorTotalMateriais + maoDeObra) * 0.3
  const empresaGD = Math.ceil(empresaGDBase / 100) * 100

  /* =======================
     🔍 LOG DE AUDITORIA
     ======================= */
  if (process.env.NODE_ENV !== "production") {
    console.groupCollapsed("🧮 [calcularTotais] Auditoria Empresa GD (20%)")
    console.log("Madeiras:", totalMadeiras.toFixed(2))
    console.log("Materiais Gerais:", totalMateriais.toFixed(2))
    console.log("Telha mais cara:", telhaMaxTotal.toFixed(2))
    console.log("Subtotal Materiais:", valorTotalMateriais.toFixed(2))
    console.log("Mão de Obra:", maoDeObra.toFixed(2))
    console.log(
      "Base 20% (materiais + mão de obra):",
      (valorTotalMateriais + maoDeObra).toFixed(2)
    )
    console.log("Empresa GD (20%):", empresaGD.toFixed(2))
    console.groupEnd()
  }

  return { maoDeObra, empresaGD }
}

/* ────────────────────────────────────────────────────────────────
   CÁLCULO DA MÃO DE OBRA
───────────────────────────────────────────────────────────────── */

function calcularMaoDeObra(madeiras: Item[] = []): number {
  const qtdPontaletes = madeiras
    .filter(m => (m?.componente ?? "") === "Pontalete")
    .reduce((sum, m) => sum + toPos(m?.quantidade), 0)

  const componentesColuna = ["Colunas Traseiras", "Colunas Frontais", "Coluna"]

  const totalLinhasColuna = madeiras
    .filter(m => componentesColuna.includes((m?.componente ?? "") as string))
    .reduce((sum, m) => sum + toPos(m?.quantidade), 0)

  const qtdColunas = totalLinhasColuna / 2

  if (qtdColunas >= 6) return 2400
  if (qtdColunas >= 4) return 2100
  if (qtdColunas >= 2) return 1800

  if (qtdPontaletes >= 6) return 1500
  if (qtdPontaletes >= 4) return 1500

  return 1500
}

/* ────────────────────────────────────────────────────────────────
   CÁLCULO DO VALOR TOTAL DOS MATERIAIS
───────────────────────────────────────────────────────────────── */

function calcularValorTotalMateriais(
  madeiras: Item[] = [],
  materiais: Item[] = [],
  telhas: Item[] = []
) {
  const totalMadeiras = madeiras.reduce((sum, m) => {
    const qtd = toPos(m?.quantidade)
    const tam = toPos(m?.tamanho)
    const preco = getPreco(m)
    return sum + (tam > 0 ? tam * qtd * preco : qtd * preco)
  }, 0)

  const totalMateriais = materiais.reduce((sum, m) => {
    const qtd = toPos(m?.quantidade)
    const preco = getPreco(m)
    return sum + qtd * preco
  }, 0)

  let telhaMaxTotal = 0
  if (telhas.length > 0) {
    telhaMaxTotal = Math.max(
      ...telhas.map(
        t => toPos(t?.quantidade) * getPreco(t) + toPos(t?.frete)
      )
    )
  }

  const valorTotalMateriais =
    totalMadeiras + totalMateriais + telhaMaxTotal

  return {
    totalMadeiras,
    totalMateriais,
    telhaMaxTotal,
    valorTotalMateriais,
  }
}
