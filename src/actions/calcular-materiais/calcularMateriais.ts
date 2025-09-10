/* ----------------------------------------------
   GRANDESIGN – calcularMateriais.ts (com dispatcher)
   ---------------------------------------------- */
import {
  getMateriaisByDescricoes,
  getReceitasFixas,
  getMateriaisByIds,
  type MaterialRow,
} from "./calcularMateriais-db"

/* ================= Tipos ================= */

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

type Resultado = {
  madeira:   MaterialCalculado[]
  materiais: MaterialCalculado[]
  telhas:    MaterialCalculado[]
}

type CobertaLOpts = {
  larguraMaior: number
  comprimentoMaior: number
  larguraMenor: number
  comprimentoMenor: number
  /** opcional: se tipoObra vier como "Coberta em L - Linha na Parede 15" não precisa setar */
  tipoBaseL?: string
}

/* ============================================================
 *  PONTO DE ENTRADA PÚBLICO – dispatcher
 *  calcularMateriais(tipoObra, largura, comprimento, opts?)
 * ============================================================ */
export async function calcularMateriais(
  tipoObra: string,
  largura?: number,
  comprimento?: number,
  opts?: Partial<CobertaLOpts>,
): Promise<Resultado> {
  const norm = (tipoObra ?? "").replace(/\u00A0/g, " ").trim()

  // Detecta Coberta em L (aceita "Coberta em L" e "Coberta em L - Linha na Parede 15")
  if (/^Coberta em L/i.test(norm)) {
    const tipoBaseL = norm.replace(/^Coberta em L\s*-\s*/i, "").trim() // 🔧 trim
    const base = tipoBaseL && tipoBaseL !== norm ? tipoBaseL : (opts?.tipoBaseL ?? "Linha na Parede 15")

    const L = {
      LMaior: opts?.larguraMaior ?? 0,
      CMaior: opts?.comprimentoMaior ?? 0,
      LMenor: opts?.larguraMenor ?? 0,
      CMenor: opts?.comprimentoMenor ?? 0,
    }

    if (!L.LMaior || !L.CMaior || !L.LMenor || !L.CMenor) {
      throw new Error("Coberta em L: informe largura/comprimento MAIOR e MENOR.")
    }

    return calcularMateriaisCobertaL(base, L.LMaior, L.CMaior, L.LMenor, L.CMenor)
  }

  // Fluxo normal (compatível com chamadas antigas)
  if (!tipoObra || !largura || !comprimento) {
    throw new Error("Parâmetros obrigatórios: tipoObra, largura, comprimento")
  }
  return calcularMateriaisNormal(tipoObra, largura, comprimento)
}

/* ============================================================
 *                IMPLEMENTAÇÃO – OBRA NORMAL
 * ============================================================ */
async function calcularMateriaisNormal(
  tipoObra: string,
  largura: number,
  comprimento: number,
): Promise<Resultado> {
  const madeiraRaw: MadeiraRow[] = []
  const materiaisRaw: BaseRow[] = []
  const telhasRaw: BaseRow[] = []

  const area       = largura * comprimento
  const largArred  = ROUND_HALF(largura)
  const compArred  = ROUND_HALF(comprimento)
  const espessura  = tipoObra.includes("11,5") ? "11,5cm" : "15cm"

  const add = (descricao: string, componente: string, qtd: number, tam: number) => {
    if (qtd <= 0) return
    madeiraRaw.push({ descricao, componente, quantidade: qtd, tamanho: toStr(tam) })
  }
  const addMaterial = (descricao: string, qtd: number) => {
    if (qtd <= 0) return
    materiaisRaw.push({ descricao, componente: "", quantidade: qtd })
  }

  /* ------------------ Lógica principal ------------------ */
  switch (true) {
    case /^Coluna /.test(tipoObra): {
      add(`Linha ${espessura}`, "Colunas Traseiras", 4, 4.5)
      const qtdFrontais = comprimento >= 6 ? 8 : 4
      add(`Linha ${espessura}`, "Colunas Frontais", qtdFrontais, 3.5)
      break
    }

    case /^Pontalete /.test(tipoObra): {
      const pranchaoBase = comprimento >= 6 ? 3 : 2
      add(`Linha ${espessura}`, "Pontalete", pranchaoBase * 2, 2.5)
      break
    }

    case /^Linha na Parede \+ Coluna/.test(tipoObra): {
      add("Linha 10cm", "Linha na Parede", 1, largArred)
      const qtdCol = comprimento >= 6 ? 8 : 4
      add(`Linha ${espessura}`, "Coluna", qtdCol, 3.5)
      break
    }

    case /^Linha na Parede/.test(tipoObra): {
      add("Linha 10cm", "Linha na Parede", 1, largArred)
      break
    }

    case /^Pergolado /.test(tipoObra): {
      const madeiraVar = `Linha ${espessura}`
      add(madeiraVar, "Travessa", 2, largArred)
      add(madeiraVar, "Pérgola", ROUND_INT(largura / 0.35) + 1, compArred)
      // sem Caibro no Pergolado
      break
    }

    case /^Caramanchão /.test(tipoObra): {
      const madeiraVar = `Linha ${espessura}`
      add(madeiraVar, "Colunas Traseiras", 4, 4.5)
      const qtdFrontais = comprimento > 6 ? 8 : 4
      add(madeiraVar, "Colunas Frontais", qtdFrontais, 3.5)
      add(madeiraVar, "Travessa", 2, largArred)
      add(madeiraVar, "Pérgola", ROUND_INT(largura / 0.35), compArred)
      add("Caibro", "Caibros", 2, largArred)
      break
    }

    default:
      throw new Error(`Tipo de obra não reconhecido: ${tipoObra}`)
  }

  /* ------------------ Madeira comum ------------------ */
  if (!/^(Pergolado|Caramanchão)/.test(tipoObra)) {
    // REGRA DOS BRABOS: ≥6 => 3 ; <6 => 2
    const pranchaoBase = comprimento >= 6 ? 3 : 2

    const isLinhaParede          = /^Linha na Parede(?! \+ Coluna)/.test(tipoObra)
    const isLinhaParedeComColuna = /^Linha na Parede \+ Coluna/.test(tipoObra)

    // a linha na parede conta como 1 pranchão (com e sem coluna)
    const pranchaoEfetivo = (isLinhaParede || isLinhaParedeComColuna)
      ? Math.max(0, pranchaoBase - 1)
      : pranchaoBase

    if (pranchaoEfetivo > 0) {
      add("Linha 30cm", "Pranchão", pranchaoEfetivo, largArred)
    }

    // pontalete só no "Linha na Parede" (sem coluna): 2 por pranchão efetivo
    if (isLinhaParede && pranchaoEfetivo > 0) {
      add(`Linha ${espessura}`, "Pontalete", pranchaoEfetivo * 2, 2.5)
    }

    // TERÇAS: default 11,5cm; exceção para Linha na Parede com 5–6 em L e C
// TERÇAS (madeira comum):
// Regra: se comprimento > 4,5 m → usar 15 cm;
// EXCETO: se houver 3 pranchões (≥6 m) E comprimento ≤ 7 m → usar 11,5 cm.
// Caso contrário, 11,5 cm.
let tipoTerca = "Linha 11,5cm"
const hasThreePranchao = pranchaoBase === 3

if (comprimento > 4.5) {
  tipoTerca = (hasThreePranchao && comprimento <= 7)
    ? "Linha 11,5cm"
    : "Linha 15cm"
}


    add(tipoTerca, "Terças", ROUND_INT(largura) + 1, ROUND_HALF(comprimento + 0.5))
    add("Caibro", "Caibros", ROUND_INT(comprimento / 0.32) + 1, largArred)
    add("Beiral Trab. 15cm", "Beiral", 1, largArred)
  }

  /* ------------------ Cálculo automático de colunas ------------------ */
  const componentesColuna = ["Colunas Traseiras", "Colunas Frontais", "Coluna"]
  const totalLinhasColuna = madeiraRaw
    .filter(m => componentesColuna.includes(m.componente))
    .reduce((s, x) => s + x.quantidade, 0)

  const qtdColunasLinhas = totalLinhasColuna / 2

  if (qtdColunasLinhas > 0) {
    addMaterial("Parafusos Franceses", qtdColunasLinhas * 3 + 3)
    addMaterial("Cimento, Areia e Brita", ROUND_INT(qtdColunasLinhas / 2))
    addMaterial("Impermeabilizante", 1) // preço multiplicado pelo nº de colunas no toCalc
  }

  /* ------------------ Parafuso sextavado ------------------ */
  const qtdPontal = madeiraRaw
    .filter(m => m.componente === "Pontalete")
    .reduce((s, x) => s + x.quantidade, 0)

  const temLinhaParede = madeiraRaw.some(m => m.componente === "Linha na Parede")

  let qtdSextavado = 0
  if (qtdPontal)      qtdSextavado += qtdPontal * 3
  if (temLinhaParede) qtdSextavado += ROUND_INT(largura)
  if (qtdSextavado > 0) addMaterial("Parafuso Sextavado", qtdSextavado + 2)

  /* ------------------ Telhas ------------------ */
  if (!/^(Pergolado|Caramanchão)/.test(tipoObra)) {
    const formulas = {
      Romana:    { factor: 17, offset: 10 },
      Americana: { factor: 12, offset: 10 },
      Colonial:  { factor: 33, offset: 10 },
      Maxxi:     { factor: 8,  offset: 10 },
    } as const

    (Object.keys(formulas) as (keyof typeof formulas)[]).forEach(nome => {
      const { factor, offset } = formulas[nome]
      const qtd = ROUND_INT(area * factor + offset)
      telhasRaw.push({ descricao: nome, componente: "", quantidade: qtd })
    })
  }

  /* ------------------ Receitas fixas ------------------ */
  try {
    const receitasFixas = await getReceitasFixas(tipoObra)
    const ids = receitasFixas.map(r => r.material_id)
    const materiaisFixos = await getMateriaisByIds(ids)

    receitasFixas.forEach(({ material_id, quantidade }) => {
      const material = materiaisFixos.find(m => m.id === material_id)
      if (material) {
        const jaExiste = materiaisRaw.some(m => m.descricao === material.descricao)
        if (!jaExiste) {
          materiaisRaw.push({ descricao: material.descricao, componente: "", quantidade })
        }
      }
    })
  } catch (err) {
    console.error("Erro ao carregar receitas fixas:", err)
  }

  /* ------------------ Agrupar / preços / retorno ------------------ */
  const agrupar = <T extends BaseRow>(rows: T[]): T[] => {
    const map = new Map<string, T>()
    rows.forEach(r => {
      const key = `${r.descricao}|${r.componente}|${r.tamanho ?? ""}`
      const atual = map.get(key)
      if (atual) atual.quantidade += r.quantidade
      else map.set(key, { ...r })
    })
    return Array.from(map.values())
  }

  const ordemMadeira = [
    "Linha na Parede", "Colunas Traseiras", "Colunas Frontais",
    "Coluna", "Pranchão", "Pontalete",
    "Travessa", "Pérgola", "Terças",
    "Caibros", "Beiral"
  ] as const
  type ComponenteOrdem = typeof ordemMadeira[number]
  const ordenarMadeiras = (a: MadeiraRow, b: MadeiraRow) => {
    const iA = ordemMadeira.indexOf(a.componente as ComponenteOrdem)
    const iB = ordemMadeira.indexOf(b.componente as ComponenteOrdem)
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
      ? (mapaPrecos.get(r.descricao) ?? 0) * (qtdColunasLinhas || 0)
      : (mapaPrecos.get(r.descricao) ?? 0),
    ...(r.tamanho ? { tamanho: r.tamanho } : {}),
  })

  return {
    madeira:   madeiraAgrup.map(toCalc),
    materiais: materiaisAgrup.map(toCalc),
    telhas:    telhasAgrup.map(toCalc),
  }
}

/* ============================================================
 *          IMPLEMENTAÇÃO – COBERTA EM L (coluna na frente)
 *          Componentes:
 *          Pontalete, Pranchão(maior/menor), Terça(maior/menor),
 *          Caibro(maior/menor), Beiral(maior/menor/meio)
 * ============================================================ */
export async function calcularMateriaisCobertaL(
  tipoBase: string,   // "Linha na Parede 15" | "Coluna 11,5" | "Pontalete 15" | "Linha na Parede + Coluna 11,5"
  LMaior: number,
  CMaior: number,
  LMenor: number,
  CMenor: number,
): Promise<Resultado> {
  if (!tipoBase || !LMaior || !CMaior || !LMenor || !CMenor) {
    throw new Error("Parâmetros obrigatórios da Coberta em L não informados.")
  }

  const madeiraRaw: MadeiraRow[] = []
  const materiaisRaw: BaseRow[] = []
  const telhasRaw: BaseRow[] = []

  const espessura = tipoBase.includes("11,5") ? "11,5cm" : "15cm"

  const add = (descricao: string, componente: string, qtd: number, tam: number) => {
    if (qtd <= 0) return
    madeiraRaw.push({ descricao, componente, quantidade: qtd, tamanho: toStr(ROUND_HALF(tam)) })
  }
  const addMaterial = (descricao: string, qtd: number) => {
    if (qtd <= 0) return
    materiaisRaw.push({ descricao, componente: "", quantidade: qtd })
  }

  /* ---------- 1) Pranchões (total 3: 2 no maior, 1 no menor) ---------- */
  add("Linha 30cm", "Pranchão (maior)", 2, LMaior)
  add("Linha 30cm", "Pranchão (menor)", 1, LMenor)

  /* ---------- 2) Pontaletes (fixo = 5, 2,5 m) ---------- */
  add(`Linha ${espessura}`, "Pontalete", 5, 2.5)

  /* ---------- 3) Terças (L) ---------- */
  // Tipo único no L (com 3 pranchões não passa de 4,5 m sem apoio)
  const tipoTercaL = "Linha 11,5cm"
  // Quantidades
  const tercasMaior = ROUND_INT(Math.max(1, (LMaior - LMenor) + 2))
  const tercasMenor = ROUND_INT(Math.max(0, LMenor - 1))
  // Tamanhos: comprimento + 0,5 (arredondado para 0,5 pelo add)
  add(tipoTercaL, "Terça (maior)", tercasMaior, CMaior + 0.5)
  add(tipoTercaL, "Terça (menor)", tercasMenor, CMenor + 0.5)

  /* ---------- 4) Caibros ---------- */
  // Quantidades: em função dos comprimentos, passo 0,32 m
  const caibrosMaior = ROUND_INT(Math.max(0, (CMenor) / 0.32 + 1))          // cobre a perna maior
  const caibrosMenor = ROUND_INT(Math.max(0, (CMaior - CMenor) / 0.32))     // cobre a perna menor
  // Tamanhos pelos L maiores/menores
  add("Caibro", "Caibro (maior)", caibrosMaior, LMaior)
  add("Caibro", "Caibro (menor)", caibrosMenor, LMenor)

  /* ---------- 5) Beirais ---------- */
  add("Beiral Trab. 15cm", "Beiral (maior)", 1, LMaior + 0.5)               // maior
  add("Beiral Trab. 15cm", "Beiral (meio)",  1, (CMaior - CMenor) + 0.5)    // meio
  // (sem "Beiral (menor)")

  /* ---------- 6) Coluna fixa na Coberta em L ---------- */
  const qtdColunas = 1
  // Madeira da coluna (1 coluna = 2 linhas de 3,5 m)
  add(`Linha ${espessura}`, "Coluna", 2, 3.5)
  // Materiais derivados da coluna
  addMaterial("Parafusos Franceses", qtdColunas * 3 + 1)
  addMaterial("Cimento, Areia e Brita", ROUND_INT(qtdColunas / 2))
  addMaterial("Impermeabilizante", 1) // preço multiplicado por qtdColunas no toCalc

  /* ---------- 7) Parafuso Sextavado ---------- */
  // 5 pontaletes fixos → 3 por pontalete + 2 de folga
  const qtdSextavado = 5 * 3 + 2
  addMaterial("Parafuso Sextavado", qtdSextavado)

  /* ---------- 8) Telhas: Área1 + Área2, com 8% de perda por recorte ---------- */
  const area1 = CMenor * LMaior
  const area2 = (CMaior - CMenor) * LMenor
  const areaComPerda = (area1 + area2) * 1.08

  const formulas = {
    Romana:    { factor: 17, offset: 10 },
    Americana: { factor: 12, offset: 10 },
    Colonial:  { factor: 33, offset: 10 },
    Maxxi:     { factor: 8,  offset: 10 },
  } as const

  ;(Object.keys(formulas) as (keyof typeof formulas)[]).forEach(nome => {
    const { factor, offset } = formulas[nome]
    const qtd = ROUND_INT(areaComPerda * factor + offset)
    telhasRaw.push({ descricao: nome, componente: "", quantidade: qtd })
  })

  /* ---------- Agrupar / ordenar / preços / retorno ---------- */
  const agrupar = <T extends BaseRow>(rows: T[]): T[] => {
    const map = new Map<string, T>()
    for (const r of rows) {
      const key = `${r.descricao}|${r.componente}|${r.tamanho ?? ""}`
      const atual = map.get(key)
      if (atual) atual.quantidade += r.quantidade
      else map.set(key, { ...r })
    }
    return Array.from(map.values())
  }

  // Ordem de exibição (inclui nomes específicos usados no L)
  const ordemMadeira = [
    "Linha na Parede", "Colunas Traseiras", "Colunas Frontais",
    "Coluna",
    "Pranchão", "Pranchão (maior)", "Pranchão (menor)",
    "Pontalete",
    "Travessa", "Pérgola",
    "Terças", "Terça (maior)", "Terça (menor)",
    "Caibros", "Caibro (maior)", "Caibro (menor)",
    "Beiral", "Beiral (maior)", "Beiral (meio)"
  ] as const
  type ComponenteOrdem = typeof ordemMadeira[number]
  const ordenarMadeiras = (a: MadeiraRow, b: MadeiraRow) => {
    const iA = ordemMadeira.indexOf(a.componente as ComponenteOrdem)
    const iB = ordemMadeira.indexOf(b.componente as ComponenteOrdem)
    return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB)
  }

  const madeiraAgrupOrd = agrupar(madeiraRaw).sort(ordenarMadeiras) as MadeiraRow[]
  const materiaisAgrup  = agrupar(materiaisRaw)
  const telhasAgrup     = agrupar(telhasRaw)

  const descricoesBusca = [...madeiraAgrupOrd, ...materiaisAgrup, ...telhasAgrup]
    .map(r => r.descricao).filter((v, i, a) => a.indexOf(v) === i)

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
      ? (mapaPrecos.get(r.descricao) ?? 0) * (qtdColunas || 0)
      : (mapaPrecos.get(r.descricao) ?? 0),
    ...(r.tamanho ? { tamanho: r.tamanho } : {}),
  })

  return {
    madeira:   madeiraAgrupOrd.map(toCalc),
    materiais: materiaisAgrup.map(toCalc),
    telhas:    telhasAgrup.map(toCalc),
  }
}

