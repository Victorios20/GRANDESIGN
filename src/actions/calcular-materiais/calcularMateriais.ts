/* ----------------------------------------------
   GRANDESIGN – calcularMateriais.ts (atualizado)
   ---------------------------------------------- */
import { getMateriaisByDescricoes, type MaterialRow } from "./calcularMateriais-db"

export interface MaterialCalculado {
  descricao: string
  componente: string
  quantidade: number
  preco_unitario: number
  tamanho?: string
  frete?: number
}

const ceil       = Math.ceil
const HALF       = 0.5
const ROUND_HALF = (v: number) => ceil(v / HALF) * HALF
const ROUND_INT  = (v: number) => ceil(v)
const toStr      = (v: number) => v.toFixed(1).replace(".", ",")

interface BaseRow {
  descricao: string
  componente: string
  quantidade: number
  tamanho?: string
}

interface MadeiraRow extends BaseRow {
  tamanho: string
}

export async function calcularMateriais(
  tipoObra: string,
  largura: number,
  comprimento: number,
) {
  if (!tipoObra || !largura || !comprimento)
    throw new Error("Parâmetros obrigatórios: tipoObra, largura, comprimento")

  const madeiraRaw: MadeiraRow[] = []
  const materiaisRaw: BaseRow[] = []
  const telhasRaw: BaseRow[] = []

  const area       = largura * comprimento
  const largArred  = ROUND_HALF(largura)
  const compArred  = ROUND_HALF(comprimento)
  const espessura  = tipoObra.includes("11,5") ? "11,5cm" : "15cm"

  const add = (descricao: string, componente: string, qtd: number, tam: number) => {
    if (qtd <= 0) return
    madeiraRaw.push({
      descricao,
      componente,
      quantidade: ROUND_INT(qtd),
      tamanho: toStr(tam),
    })
  }

  const addMaterial = (descricao: string, qtd: number) => {
    if (qtd <= 0) return
    materiaisRaw.push({ descricao, componente: "", quantidade: ROUND_INT(qtd) })
  }

  let qtdColunasAtual = 0

  switch (true) {
    case /^Coluna /.test(tipoObra): {
      add(`Linha ${espessura}`, "Colunas Traseiras", 4, 4.5)
      const qtdFrontais = comprimento >= 6 ? 8 : 4
      add(`Linha ${espessura}`, "Colunas Frontais", qtdFrontais, 3.5)
      qtdColunasAtual = qtdFrontais + 4
      break
    }

    case /^Pontalete /.test(tipoObra): {
      const pranchao = comprimento >= 6 ? 3 : 2
      add(`Linha ${espessura}`, "Pontalete", pranchao * 2, 2.5)
      break
    }

    case /^Linha na Parede \+ Coluna/.test(tipoObra): {
      add("Linha 10cm", "Linha na Parede", 1, largArred)
      const qtdCol = comprimento >= 6 ? 8 : 4
      add(`Linha ${espessura}`, "Coluna", qtdCol, 3.5)
      qtdColunasAtual = qtdCol
      break
    }

    case /^Linha na Parede/.test(tipoObra): {
      add("Linha 10cm", "Linha na Parede", 1, largArred)
      const pranchao = comprimento >= 6 ? 3 : 2
      if (pranchao > 1) add(`Linha 30cm`, "Pranchão", pranchao - 1, largArred)
      const pontaletes = (pranchao - 1) * 2
      if (pontaletes > 0) add(`Linha ${espessura}`, "Pontalete", pontaletes, 2.5)
      break
    }

    case /^Pergolado /.test(tipoObra): {
      const madeiraVar = `Linha ${espessura}`
      add(madeiraVar, "Travessa", 2, largArred)
      add(madeiraVar, "Pérgola", ROUND_INT(largura / 0.35) + 1, compArred)
      add("Caibro", "Caibros", 2, largArred)
      break
    }

    case /^Caramanchão /.test(tipoObra): {
      const madeiraVar = `Linha ${espessura}`
      add(madeiraVar, "Colunas Traseiras", 4, 4.5)
      const qtdFrontais = comprimento > 6 ? 8 : 4
      add(madeiraVar, "Colunas Frontais", qtdFrontais, 3.5)
      qtdColunasAtual = qtdFrontais + 4
      add(madeiraVar, "Travessa", 2, largArred)
      add(madeiraVar, "Pérgola", ROUND_INT(comprimento / 0.35) + 1, compArred)
      add("Caibro", "Caibros", 2, largArred)
      break
    }

    default:
      throw new Error(`Tipo de obra não reconhecido: ${tipoObra}`)
  }

  if (!/^Pergolado|^Caramanchão/.test(tipoObra)) {
    add(`Linha ${espessura}`, "Terças", ROUND_INT(largura) + 1, ROUND_HALF(comprimento + 0.5))
    add("Caibro", "Caibros", ROUND_INT(comprimento / 0.32) + 1, largArred)
    const qtdPranchao = comprimento >= 6 ? 3 : 2
    add("Linha 30cm", "Pranchão", qtdPranchao, largArred)
    add(`Beiral Trab. ${espessura}`, "Beiral Trab.", 1, largArred)
  }

  addMaterial("Rufo", 1)

  if (qtdColunasAtual) {
    addMaterial("Parafusos Franceses", qtdColunasAtual * 3 + 3)
    addMaterial("Cimento, Areia e Brita", qtdColunasAtual / 2)
    addMaterial("Impermeabilizante", 1)
  }

  const qtdPontal = madeiraRaw.filter(m => m.componente === "Pontalete").reduce((s, x) => s + x.quantidade, 0)
  const temLinhaParede = madeiraRaw.some(m => m.componente === "Linha na Parede")

  let qtdSextavado = 0
  if (qtdPontal) qtdSextavado += qtdPontal * 3
  if (temLinhaParede) qtdSextavado += ROUND_INT(largura)
  if (qtdSextavado > 0) addMaterial("Parafuso Sextavado", qtdSextavado + 2)

  if (!/^Pergolado|^Caramanchão/.test(tipoObra)) {
    const formulas = {
      Romana:    { factor: 17, offset: 40 },
      Americana: { factor: 12, offset: 40 },
      Colonial:  { factor: 33, offset: 50 },
    } as const

    (Object.keys(formulas) as (keyof typeof formulas)[]).forEach(nome => {
      const { factor, offset } = formulas[nome]
      const qtd = ROUND_INT(area * factor + offset)
      telhasRaw.push({ descricao: nome, componente: "", quantidade: qtd })
    })
  }

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

  const ordemMadeira = [
    "Colunas Traseiras", "Colunas Frontais", "Coluna",
    "Linha na Parede", "Pranchão", "Pontalete",
    "Travessa", "Pérgola", "Terças",
    "Caibros", "Beiral Trab."
  ]

  const ordenarMadeiras = (a: MadeiraRow, b: MadeiraRow) => {
    const iA = ordemMadeira.indexOf(a.componente)
    const iB = ordemMadeira.indexOf(b.componente)
    return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB)
  }

  const madeiraAgrup   = agrupar(madeiraRaw).sort(ordenarMadeiras) as MadeiraRow[]
  const materiaisAgrup = agrupar(materiaisRaw)
  const telhasAgrup    = agrupar(telhasRaw)

  const descricoesBusca = [...madeiraAgrup, ...materiaisAgrup, ...telhasAgrup]
    .map(r => r.descricao)
    .filter((v, i, a) => a.indexOf(v) === i)

  let precos: MaterialRow[]
  try {
    precos = await getMateriaisByDescricoes(descricoesBusca)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha ao buscar preços dos materiais."
    throw new Error(message)
  }

  const mapaPrecos = new Map<string, number>(
    precos.map(row => [row.descricao, Number(row.preco_unitario) || 0]),
  )

  const toCalc = (r: BaseRow): MaterialCalculado => ({
    descricao: r.descricao,
    componente: r.componente,
    quantidade: r.quantidade,
    preco_unitario: r.descricao === "Impermeabilizante"
      ? (mapaPrecos.get(r.descricao) ?? 0) * qtdColunasAtual
      : mapaPrecos.get(r.descricao) ?? 0,
    ...(r.tamanho ? { tamanho: r.tamanho } : {}),
  })

  return {
    madeira:   madeiraAgrup.map(toCalc),
    materiais: materiaisAgrup.map(toCalc),
    telhas:    telhasAgrup.map(toCalc),
  }
}
