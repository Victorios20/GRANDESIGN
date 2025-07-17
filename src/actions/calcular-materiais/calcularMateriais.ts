/* ------------------------------------------------------------------
   GRANDESIGN – calcularMateriais.ts (inclui tratamento de erros)
   ------------------------------------------------------------------ */
import { getMateriaisByDescricoes, type MaterialRow } from "./calcularMateriais-db"

export interface MaterialCalculado {
  descricao: string
  quantidade: number
  preco_unitario: number
  tamanho?: string
}

const ceil = Math.ceil
const HALF = 0.5
const ROUND_HALF = (v: number) => ceil(v / HALF) * HALF
const ROUND_INT = (v: number) => ceil(v)
const toStr = (v: number) => v.toFixed(1).replace(".", ",")

interface BaseRow {
  descricao: string
  quantidade: number
  tamanho?: string
}
interface MadeiraRow extends BaseRow {
  tamanho: string
}

/**
 * Calcula a lista de materiais (madeira, materiais gerais, telhas) com quantidades
 * e preços unitários provenientes do banco de dados.
 * Lança erros semânticos para que a UI trate via Snackbar.
 */
export async function calcularMateriais(
  tipoObra: string,
  largura: number,
  comprimento: number,
) {
  // ---------- Validação dos parâmetros ----------
  if (!tipoObra || !largura || !comprimento)
    throw new Error("Parâmetros obrigatórios: tipoObra, largura, comprimento")

  /* ------------------------------------------------------------------
   *                      BLOCO DE CÁLCULO (SEM ALTERAÇÕES)
   *  ------------------------------------------------------------------ */
  const madeiraRaw: MadeiraRow[] = []
  const area = largura * comprimento
  const largArred = ROUND_HALF(largura)
  const compArred = ROUND_HALF(comprimento)
  const esp = /11,5/.test(tipoObra) ? "11,5cm" : "15cm"

  const add = (desc: string, qtd: number, tam: number) => {
    if (qtd <= 0) return
    madeiraRaw.push({ descricao: desc, quantidade: ROUND_INT(qtd), tamanho: toStr(tam) })
  }

  switch (true) {
    case /^Coluna\s+/.test(tipoObra): {
      add(`Linha ${esp} (Colunas Traseiras)`, 4, 4.5)
      add(`Linha ${esp} (Colunas Frontais)`, comprimento >= 6 ? 8 : 4, 3.5)
      break
    }
    case /^Pontalete\s+/.test(tipoObra): {
      const pranchao = comprimento >= 6 ? 3 : 2
      add(`Linha ${esp} (Pontalete)`, pranchao * 2, 2.5)
      break
    }
    case /^Linha na Parede\s+\+ Coluna/.test(tipoObra): {
      add(`Linha ${esp} (Parede)`, 1, largArred)
      add(`Linha ${esp} (Coluna)`, comprimento >= 6 ? 8 : 4, 3.5)
      break
    }
    case /^Linha na Parede/.test(tipoObra): {
      add(`Linha ${esp} (Parede)`, 1, largArred)
      const pranchao = comprimento >= 6 ? 3 : 2
      add(`Linha ${esp} (Pontalete)`, Math.max(pranchao - 1, 0) * 2, 2.5)
      break
    }
    case /^Pergolado/.test(tipoObra): {
      add(`Linha ${esp} (Travessa)`, 2, largArred)
      const qtdPerg = ROUND_INT(largura / 0.35) + 1
      add(`Linha ${esp} (Pérgola)`, qtdPerg, compArred)
      add("Caibros", 2, compArred)
      break
    }
    case /^Caramanch/.test(tipoObra): {
      add(`Linha ${esp} (Colunas Traseiras)`, 4, 4.5)
      add(`Linha ${esp} (Colunas Frontais)`, comprimento > 6 ? 8 : 4, 3.5)
      add(`Linha ${esp} (Travessa)`, 2, compArred)
      const qtdPerg = ROUND_INT(comprimento / 0.35) + 1
      add(`Linha ${esp} (Pérgola)`, qtdPerg, largArred)
      break
    }
    default:
      throw new Error(`Tipo de obra não reconhecido: ${tipoObra}`)
  }

  // Peças comuns
  add(`Linha ${esp} (Terças)`, ROUND_INT(largura) + 1, ROUND_HALF(comprimento + 0.5))
  add("Caibros", ROUND_INT(comprimento / 0.32) + 1, largArred)
  add("Linha 30cm (Pranchão)", comprimento >= 6 ? 3 : 2, largArred)
  add(`Beiral Trab. ${esp}`, 1, largArred)

  /* ---------- Materiais gerais ---------- */
  const materiaisRaw: BaseRow[] = []
  materiaisRaw.push({ descricao: "Rufo", quantidade: 1 })

  const qtdColunas = madeiraRaw
    .filter(m => m.descricao.includes("Coluna"))
    .reduce((s, x) => s + x.quantidade, 0)
  if (qtdColunas) {
    materiaisRaw.push({ descricao: "Parafusos Franceses", quantidade: qtdColunas * 3 + 3 })
    const sacos = ROUND_INT(qtdColunas / 2)
    materiaisRaw.push({ descricao: "Cimento, Areia e Brita", quantidade: sacos })
  }

  const qtdPontal = madeiraRaw
    .filter(m => m.descricao.includes("Pontalete"))
    .reduce((s, x) => s + x.quantidade, 0)
  if (qtdPontal) {
    materiaisRaw.push({ descricao: "Parafuso Sextavado", quantidade: qtdPontal * 3 + 2 })
  }

  if (/^Linha na Parede/.test(tipoObra)) {
    materiaisRaw.push({ descricao: "Parafuso Sextavado", quantidade: ROUND_INT(largura) })
  }

  /* ---------- Telhas ---------- */
  const telhasRaw: BaseRow[] = []
  if (!/^Pergolado|^Caramanch/.test(tipoObra)) {
    const qtdTelhas = ROUND_INT(area * 17 + 40)
    telhasRaw.push({ descricao: "Romana", quantidade: qtdTelhas })
  }

  /* ---------- Agrupamento ---------- */
  const agrupar = <T extends BaseRow>(rows: T[]): T[] => {
    const map = new Map<string, T>()
    rows.forEach(r => {
      const key = r.tamanho ? `${r.descricao}|${r.tamanho}` : r.descricao
      const atual = map.get(key)
      if (atual) {
        atual.quantidade += r.quantidade
      } else {
        map.set(key, { ...r })
      }
    })
    return Array.from(map.values())
  }

  const madeiraAgrup = agrupar(madeiraRaw) as MadeiraRow[]
  const materiaisAgrup = agrupar(materiaisRaw)
  const telhasAgrup = agrupar(telhasRaw)

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
    // Encapsula para manter mensagem amigável na UI
    throw new Error(message)
  }


  const mapaPrecos = new Map<string, number>(
    precos.map(row => [row.descricao, Number(row.preco_unitario) || 0]),
  )

  const toCalc = (r: BaseRow): MaterialCalculado => ({
    descricao: r.descricao,
    quantidade: r.quantidade,
    preco_unitario: mapaPrecos.get(r.descricao) ?? 0,
    ...(r.tamanho ? { tamanho: r.tamanho } : {}),
  })

  return {
    madeira: madeiraAgrup.map(toCalc),
    materiais: materiaisAgrup.map(toCalc),
    telhas: telhasAgrup.map(toCalc),
  }
}
