/* ------------------------------------------------------------------
   GRANDESIGN – calcularMateriais.ts (refatorado para campo componente)
   ------------------------------------------------------------------ */
import { getMateriaisByDescricoes, type MaterialRow } from "./calcularMateriais-db"

export interface MaterialCalculado {
  descricao: string         // “Linha 15cm”
  componente: string        // “Colunas Traseiras”
  quantidade: number
  preco_unitario: number
  tamanho?: string
}

const ceil = Math.ceil
const HALF = 0.5
const ROUND_HALF = (v: number) => ceil(v / HALF) * HALF
const ROUND_INT  = (v: number) => ceil(v)
const toStr      = (v: number) => v.toFixed(1).replace(".", ",")

/* ------------------------- Tipos internos ------------------------ */
interface BaseRow {
  descricao: string
  componente: string
  quantidade: number
  tamanho?: string
}

interface MadeiraRow extends BaseRow {
  tamanho: string
}

/* ---------------------- Função principal ------------------------ */
export async function calcularMateriais(
  tipoObra: string,
  largura: number,
  comprimento: number,
) {
  /* ---------- Validação ---------- */
  if (!tipoObra || !largura || !comprimento)
    throw new Error("Parâmetros obrigatórios: tipoObra, largura, comprimento")

  /* ---------- Bloco de cálculo ---------- */
  const madeiraRaw: MadeiraRow[] = []
  const area       = largura * comprimento
  const largArred  = ROUND_HALF(largura)
  const compArred  = ROUND_HALF(comprimento)
  const esp        = /11,5/.test(tipoObra) ? "11,5cm" : "15cm"

  const add = (
    descricao: string,
    componente: string,
    qtd: number,
    tam: number,
  ) => {
    if (qtd <= 0) return
    madeiraRaw.push({
      descricao,
      componente,
      quantidade: ROUND_INT(qtd),
      tamanho: toStr(tam),
    })
  }

  /* --------- Regras específicas --------- */
  switch (true) {
    case /^Coluna\s+/.test(tipoObra): {
      add(`Linha ${esp}`, "Colunas Traseiras", 4, 4.5)
      add(`Linha ${esp}`, "Colunas Frontais", comprimento >= 6 ? 8 : 4, 3.5)
      break
    }
    case /^Pontalete\s+/.test(tipoObra): {
      const pranchao = comprimento >= 6 ? 3 : 2
      add(`Linha ${esp}`, "Pontalete", pranchao * 2, 2.5)
      break
    }
    case /^Linha na Parede\s+\+ Coluna/.test(tipoObra): {
      add(`Linha ${esp}`, "Parede", 1, largArred)
      add(`Linha ${esp}`, "Coluna", comprimento >= 6 ? 8 : 4, 3.5)
      break
    }
    case /^Linha na Parede/.test(tipoObra): {
      add(`Linha ${esp}`, "Parede", 1, largArred)
      const pranchao = comprimento >= 6 ? 3 : 2
      add(`Linha ${esp}`, "Pontalete", Math.max(pranchao - 1, 0) * 2, 2.5)
      break
    }
    case /^Pergolado/.test(tipoObra): {
      add(`Linha ${esp}`, "Travessa", 2, largArred)
      const qtdPerg = ROUND_INT(largura / 0.35) + 1
      add(`Linha ${esp}`, "Pérgola", qtdPerg, compArred)
      add("Caibro", "Caibros", 2, compArred)
      break
    }
    case /^Caramanch/.test(tipoObra): {
      add(`Linha ${esp}`, "Colunas Traseiras", 4, 4.5)
      add(`Linha ${esp}`, "Colunas Frontais", comprimento > 6 ? 8 : 4, 3.5)
      add(`Linha ${esp}`, "Travessa", 2, compArred)
      const qtdPerg = ROUND_INT(comprimento / 0.35) + 1
      add(`Linha ${esp}`, "Pérgola", qtdPerg, largArred)
      break
    }
    default:
      throw new Error(`Tipo de obra não reconhecido: ${tipoObra}`)
  }

  /* Peças comuns */
  add(`Linha ${esp}`, "Terças", ROUND_INT(largura) + 1, ROUND_HALF(comprimento + 0.5))
  add("Caibro", "Caibros", ROUND_INT(comprimento / 0.32) + 1, largArred)
  add("Linha 30cm", "Pranchão", comprimento >= 6 ? 3 : 2, largArred)
  add(`Beiral Trab. ${esp}`, "Beiral Trab.", 1, largArred)

  /* ---------- Materiais gerais ---------- */
  const materiaisRaw: BaseRow[] = []
  materiaisRaw.push({ descricao: "Rufo", componente: "", quantidade: 1 })

  const qtdColunas = madeiraRaw
    .filter(m => m.componente.includes("Coluna"))
    .reduce((s, x) => s + x.quantidade, 0)
  if (qtdColunas) {
    materiaisRaw.push({
      descricao: "Parafusos Franceses",
      componente: "",
      quantidade: qtdColunas * 3 + 3,
    })
    const sacos = ROUND_INT(qtdColunas / 2)
    materiaisRaw.push({
      descricao: "Cimento, Areia e Brita",
      componente: "",
      quantidade: sacos,
    })
  }

  const qtdPontal = madeiraRaw
    .filter(m => m.componente.includes("Pontalete"))
    .reduce((s, x) => s + x.quantidade, 0)
  if (qtdPontal) {
    materiaisRaw.push({
      descricao: "Parafuso Sextavado",
      componente: "",
      quantidade: qtdPontal * 3 + 2,
    })
  }

  if (/^Linha na Parede/.test(tipoObra)) {
    materiaisRaw.push({
      descricao: "Parafuso Sextavado",
      componente: "",
      quantidade: ROUND_INT(largura),
    })
  }

  /* ---------- Telhas ---------- */
  const telhasRaw: BaseRow[] = []
  if (!/^Pergolado|^Caramanch/.test(tipoObra)) {
    const qtdTelhas = ROUND_INT(area * 17 + 40)
    telhasRaw.push({
      descricao: "Romana",
      componente: "",
      quantidade: qtdTelhas,
    })
  }

  /* ---------- Agrupamento ---------- */
  const agrupar = <T extends BaseRow>(rows: T[]): T[] => {
    const map = new Map<string, T>()
    rows.forEach(r => {
      const key = `${r.descricao}|${r.componente}|${r.tamanho ?? ""}`
      const atual = map.get(key)
      if (atual) {
        atual.quantidade += r.quantidade
      } else {
        map.set(key, { ...r })
      }
    })
    return Array.from(map.values())
  }

  const madeiraAgrup   = agrupar(madeiraRaw)   as MadeiraRow[]
  const materiaisAgrup = agrupar(materiaisRaw)
  const telhasAgrup    = agrupar(telhasRaw)

  /* ---------- Preços ---------- */
  const descricoesBusca = [...madeiraAgrup, ...materiaisAgrup, ...telhasAgrup]
    .map(r => r.descricao)
    .filter((v, i, a) => a.indexOf(v) === i)

  let precos: MaterialRow[]
  try {
    precos = await getMateriaisByDescricoes(descricoesBusca)
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Falha ao buscar preços dos materiais."
    throw new Error(message)
  }

  const mapaPrecos = new Map<string, number>(
    precos.map(row => [row.descricao, Number(row.preco_unitario) || 0]),
  )

  const toCalc = (r: BaseRow): MaterialCalculado => ({
    descricao: r.descricao,
    componente: r.componente,
    quantidade: r.quantidade,
    preco_unitario: mapaPrecos.get(r.descricao) ?? 0,
    ...(r.tamanho ? { tamanho: r.tamanho } : {}),
  })

  return {
    madeira:   madeiraAgrup.map(toCalc),
    materiais: materiaisAgrup.map(toCalc),
    telhas:    telhasAgrup.map(toCalc),
  }
}
