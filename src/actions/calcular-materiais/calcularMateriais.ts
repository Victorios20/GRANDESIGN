/* ----------------------------------------------
   GRANDESIGN – calcularMateriais.ts (com dispatcher)
   ---------------------------------------------- */
import {
  getMateriaisByDescricoes,
  getMateriaisByIds,
  getReceitasFixas,
  type MaterialRow,
} from "./calcularMateriais-db"
import { calculateLShapeArea } from "@/lib/l-shape-area"

/* ================= Tipos ================= */

export interface MaterialCalculado {
  descricao: string
  componente: string
  quantidade: number
  preco_unitario: number
  tamanho?: string
  frete?: number
}

const ceil = Math.ceil
const HALF = 0.5
const ROUND_HALF = (v: number) => ceil(v / HALF) * HALF
const ROUND_INT = (v: number) => ceil(v)
const toStr = (v: number) => v.toFixed(1).replace(".", ",")
const PONTALETE_DESCRICAO = "Linha 15cm"

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
  madeira: MaterialCalculado[]
  materiais: MaterialCalculado[]
  telhas: MaterialCalculado[]
}

type CobertaLOpts = {
  larguraMaior: number
  comprimentoMaior: number
  larguraMenor: number
  comprimentoMenor: number
  /** opcional: se tipoObra vier como "Coberta em L - Linha na Parede 15" não precisa setar */
  tipoBaseL?: string
  /** novo: quando for "Coberta em L com linha na parede" */
  comLinhaNaParede?: boolean
}

/* ============================================================
 *  TELHAS: DESCRIÇÕES REAIS DO SEU BANCO (exceto PVC/Policarbonato)
 *  (descrição = chave do preço)
 *  Ajuste aqui caso mude o cadastro.
 * ============================================================ */
const telhaDescricoesPorTipoBase = {
  Romana: ["Romana marfim resinada"],
  SuperRomana: ["Super romana vermelha natural"],
  Americana: ["Americana marfim resinada", "Americana vermelha natural"],
  Colonial: ["Colonial"],
  Maxxi: ["Maxxi"],
} as const

type TelhaNome = keyof typeof telhaDescricoesPorTipoBase

/* ============================================================
 *  PONTO DE ENTRADA PÚBLICO – dispatcher
 *  calcularMateriais(tipoObra, largura, comprimento, opts?)
 * ============================================================ */
export async function calcularMateriais(
  tipoObra: string,
  largura?: number,
  comprimento?: number,
  opts?: {
    fornecedorId: number
    corStain?: string | null
  } & Partial<CobertaLOpts>,
): Promise<Resultado> {
  const tipoNorm = (tipoObra ?? "").replace(/\u00A0/g, " ").trim()
  const fornecedorId = opts?.fornecedorId
  const corStain = opts?.corStain

  if (typeof fornecedorId !== "number") {
    throw new Error("fornecedorId obrigatório")
  }

  // Detecta Coberta em L (aceita "Coberta em L", "Coberta em L - Linha na Parede 15"
  // e também "Coberta em L com linha na parede")
  if (/^Coberta em L/i.test(tipoNorm)) {
    const comLinhaNaParede =
      /com\s+linha\s+na\s+parede/i.test(tipoNorm) || Boolean(opts?.comLinhaNaParede)

    // Remove prefixo "Coberta em L", e também remove o trecho "com linha na parede"
    // Depois tenta extrair um tipoBase após "-" (se existir).
    const semPrefixo = tipoNorm.replace(/^Coberta em L/i, "").trim()
    const semFlag = semPrefixo.replace(/com\s+linha\s+na\s+parede/i, "").trim()

    // Se vier " - Linha na Parede 15", extrai "Linha na Parede 15"
    const tipoBaseExtraido = semFlag.replace(/^\s*-\s*/i, "").trim()

    const tipoBase =
      (tipoBaseExtraido && tipoBaseExtraido !== tipoNorm ? tipoBaseExtraido : "") ||
      (opts?.tipoBaseL ?? "Linha na Parede 15")

    const L = {
      LMaior: opts?.larguraMaior ?? 0,
      CMaior: opts?.comprimentoMaior ?? 0,
      LMenor: opts?.larguraMenor ?? 0,
      CMenor: opts?.comprimentoMenor ?? 0,
    }

    if (!L.LMaior || !L.CMaior || !L.LMenor || !L.CMenor) {
      throw new Error("Coberta em L: informe largura/comprimento MAIOR e MENOR.")
    }

    console.log("[calcularMateriais] Coberta em L detectada:", {
      tipoNorm,
      tipoBase,
      comLinhaNaParede,
      ...L,
      fornecedorId,
      corStain,
    })

    return calcularMateriaisCobertaL(
      tipoBase,
      L.LMaior,
      L.CMaior,
      L.LMenor,
      L.CMenor,
      fornecedorId,
      { comLinhaNaParede, corStain },
    )
  }

  // Fluxo normal (compatível com chamadas antigas)
  if (!tipoObra || !largura || !comprimento) {
    throw new Error("Parâmetros obrigatórios: tipoObra, largura, comprimento")
  }
  return calcularMateriaisNormal(tipoNorm, largura, comprimento, fornecedorId, corStain)
}

/* ============================================================
 *                IMPLEMENTAÇÃO – OBRA NORMAL
 * ============================================================ */
async function calcularMateriaisNormal(
  tipoNorm: string,
  largura: number,
  comprimento: number,
  fornecedorId: number,
  corStain?: string | null,
): Promise<Resultado> {
  const madeiraRaw: MadeiraRow[] = []
  const materiaisRaw: BaseRow[] = []
  const telhasRaw: BaseRow[] = []

  // Flag para evitar duplicar sextavado quando já for calculado em casos específicos
  const adicionouSextavado = false

  let area = largura * ROUND_HALF(comprimento + 0.5)
  const isCorredorQuedaQuintal = /^Corredor Queda Quintal/i.test(tipoNorm)
  if (isCorredorQuedaQuintal) {
    area = largura * (ROUND_INT(comprimento) + 0.5)
  }
  const largArred = ROUND_HALF(largura)
  const compArred = ROUND_HALF(comprimento)
  const espessura = tipoNorm.includes("11,5") ? "11,5cm" : "15cm"

  const add = (descricao: string, componente: string, qtd: number, tam: number) => {
    if (qtd <= 0) return
    madeiraRaw.push({ descricao, componente, quantidade: qtd, tamanho: toStr(tam) })
  }
  const addMaterial = (descricao: string, qtd: number) => {
    if (qtd <= 0) return
    materiaisRaw.push({ descricao, componente: "", quantidade: qtd })
  }

  /* ------------------ Tipos auxiliares (NOVOS) ------------------ */
  const isCorredorQuedaLateral = /^Corredor Queda Lateral/i.test(tipoNorm)
  const isCorredorQueda = isCorredorQuedaLateral || isCorredorQuedaQuintal
  const isMaoFrancesa = /^Mão Francesa/i.test(tipoNorm)
  const isEucalipto = /^Caramanhão de Eucalipto/i.test(tipoNorm)

  /* ------------------ Lógica principal ------------------ */
  switch (true) {
    case /^Coluna /i.test(tipoNorm): {
      add(`Linha ${espessura}`, "Colunas Traseiras", 4, 4.5)
      const qtdFrontais = comprimento >= 6 ? 8 : 4
      add(`Linha ${espessura}`, "Colunas Frontais", qtdFrontais, 3.5)
      break
    }

    case /^Pontalete /i.test(tipoNorm): {
      const pranchaoBase = comprimento >= 6 ? 3 : 2
      add(PONTALETE_DESCRICAO, "Pontalete", pranchaoBase * 2, 2.5)
      break
    }

    case /^Linha na Parede \+ Coluna/i.test(tipoNorm): {
      add("Linha 10cm", "Linha na Parede", 1, largArred)
      const qtdCol = comprimento >= 6 ? 8 : 4
      add(`Linha ${espessura}`, "Coluna", qtdCol, 3.5)
      break
    }

    case /^Linha na Parede/i.test(tipoNorm): {
      add("Linha 10cm", "Linha na Parede", 1, largArred)
      break
    }

    case /^Pergolado /i.test(tipoNorm): {
      const madeiraVar = `Linha ${espessura}`
      add(madeiraVar, "Travessa", 2, largArred)
      add(madeiraVar, "Pérgola", ROUND_INT(largura / 0.35) + 1, compArred)
      break
    }

    case /^Caramanchão /i.test(tipoNorm): {
      const madeiraVar = `Linha ${espessura}`
      add(madeiraVar, "Colunas Traseiras", 4, 4.5)
      const qtdFrontais = comprimento > 6 ? 8 : 4
      add(madeiraVar, "Colunas Frontais", qtdFrontais, 3.5)
      add(madeiraVar, "Travessa", 2, largArred)
      add(madeiraVar, "Pérgola", ROUND_INT(largura / 0.35), compArred)
      add("Caibro", "Caibros", 2, largArred)
      break
    }

    case /^Caramanhão de Eucalipto/i.test(tipoNorm): {
      add("Eucalipto 12-14cm", "Coluna", 4, 3.5)
      add("Eucalipto 10-12cm", "Travessa", 2, largArred)
      add("Eucalipto 8-10cm", "Pérgola", ROUND_INT(largura / 0.35) + 1, compArred)
      break
    }

    // Base existente: Caibro e Ripa (agora também será reaproveitada pelos corredores)
    case /^Caibro e Ripa/i.test(tipoNorm): {
      break
    }

    // ===== NOVOS TIPOS =====
    case /^Corredor Queda Lateral/i.test(tipoNorm): {
      // cai no bloco comum (madeira comum) com regras específicas:
      // segue Caibro e Ripa, mas sem pranchão e sem pontalete
      break
    }

    case /^Corredor Queda Quintal/i.test(tipoNorm): {
      // 1) Linhas nas paredes: 2 linhas de 11,5cm com comprimento + 0,5m
      add("Linha 11,5cm", "Linha na Parede", 2, ROUND_HALF(comprimento + 0.5))

      // 2) Barrotes: a cada 32cm com comprimento igual à largura
      const qtdBarrotes = ROUND_INT(comprimento / 0.32) + 1
      add("Barrote", "Barrotes", qtdBarrotes, largArred)

      // 3) Beirais: 2 de 15cm com comprimento igual à largura
      add("Beiral Trab. 15cm", "Beiral", 2, largArred)
      break
    }

    // ===== MÃO FRANCESA =====
    case /^Mão Francesa/i.test(tipoNorm): {
      const qtdMF = ROUND_INT(largura / 2)

      const tamanhoVertical = Math.max(1, ROUND_HALF(0.90 * comprimento))
      const tamanhoHorizontal = Math.max(1, ROUND_HALF(0.67 * comprimento))
      const tamanhoDiagonal = Math.max(1, ROUND_HALF(0.89 * comprimento))

      const tamanhoBarroteEstrutural = Math.max(1, ROUND_HALF(largura))
      const tamanhoBarroteInclinado = Math.max(1, ROUND_HALF(comprimento * 1.3))
      const tamanhoBarroteTelha = Math.max(1, ROUND_HALF(largura))

      // 3 peças por mão francesa
      add("Linha 15cm", "mão francesa", qtdMF, tamanhoVertical)
      add("Linha 15cm", "mão francesa", qtdMF, tamanhoHorizontal)
      add("Linha 15cm", "mão francesa", qtdMF, tamanhoDiagonal)

      // 2 barrotes fixos do telhado inteiro
      add("Barrote", "barrote", 2, tamanhoBarroteEstrutural)

      // 1 barrote inclinado por mão francesa
      add("Barrote", "barrote", qtdMF, tamanhoBarroteInclinado)

      // Barrotes que seguram telha
      const compLinear = ROUND_INT(comprimento)
      const qtdBarrotesTelha = ROUND_INT(compLinear / 0.32) + 1
      add("Barrote", "barrote", qtdBarrotesTelha, tamanhoBarroteTelha)

      break
    }

    default:
      throw new Error(`Tipo de obra não reconhecido: ${tipoNorm}`)
  }

  /* ------------------ Madeira comum ------------------ */
  if (
    !/^(Pergolado|Caramanchão|Mão Francesa|Corredor Queda Quintal|Caramanhão de Eucalipto)/i.test(
      tipoNorm,
    )
  ) {
    const isCaibroRipaBase = /^Caibro e Ripa/i.test(tipoNorm)
    const isCaibroRipa = isCaibroRipaBase || isCorredorQuedaLateral
    const isLinhaParede = /^Linha na Parede(?! \+ Coluna)/i.test(tipoNorm)
    const isLinhaParedeComCol = /^Linha na Parede \+ Coluna/i.test(tipoNorm)

    // ===== PRANCHÃO =====
    if (isCaibroRipa) {
      if (!isCorredorQueda) {
        const qtdPranchao20 = ROUND_INT(comprimento / 2)
        if (qtdPranchao20 > 0) add("Linha 25cm", "Pranchão", qtdPranchao20, largArred)

        const qtdPontalete = qtdPranchao20 * 2
        if (qtdPontalete > 0) add(PONTALETE_DESCRICAO, "Pontalete", qtdPontalete, 2.5)
      }
    } else {
      const pranchaoBase = comprimento >= 6 ? 3 : 2
      const pranchaoEfetivo =
        isLinhaParede || isLinhaParedeComCol ? Math.max(0, pranchaoBase - 1) : pranchaoBase
      if (pranchaoEfetivo > 0) add("Linha 30cm", "Pranchão", pranchaoEfetivo, largArred)
    }

    // ===== PONTALETE =====
    if (!isCaibroRipa && isLinhaParede) {
      const pranchaoBase = comprimento >= 6 ? 3 : 2
      const pranchaoEfetivoLP = Math.max(0, pranchaoBase - 1)
      if (pranchaoEfetivoLP > 0)
        add(PONTALETE_DESCRICAO, "Pontalete", pranchaoEfetivoLP * 2, 2.5)
    }

    // ===== TERÇAS =====
    if (!isCaibroRipa) {
      let tipoTerca = "Linha 11,5cm"
      const hasThreePranchao = comprimento >= 6
      if (comprimento > 4.5) {
        tipoTerca = hasThreePranchao && comprimento <= 7 ? "Linha 11,5cm" : "Linha 15cm"
      }
      add(tipoTerca, "Terças", ROUND_INT(largura) + 1, ROUND_HALF(comprimento + 0.5))
    }

    // ===== CAIBROS & RIPAS =====
    if (isCaibroRipa) {
      add("Ripa", "Ripas", ROUND_INT(comprimento / 0.32) + 1, largArred)
      add("Caibro", "Caibros", ROUND_INT(largura / 0.5) + 1, compArred)
    } else {
      add("Caibro", "Caibros", ROUND_INT(comprimento / 0.32) + 1, largArred)
    }

    // ===== BEIRAL =====
    if (!isCorredorQuedaQuintal) {
      add("Beiral Trab. 15cm", "Beiral", 1, largArred)
    }
  }

  /* ------------------ Cálculo automático de colunas ------------------ */
  const componentesColuna = ["Colunas Traseiras", "Colunas Frontais", "Coluna"]
  const totalLinhasColuna = madeiraRaw
    .filter(m => componentesColuna.includes(m.componente))
    .reduce((s, x) => s + x.quantidade, 0)

  const qtdColunasLinhas = isEucalipto ? totalLinhasColuna : totalLinhasColuna / 2

  if (qtdColunasLinhas > 0) {
    addMaterial("Parafusos Franceses", qtdColunasLinhas * 3 + 3)
    addMaterial("Cimento, Areia e Brita", ROUND_INT(qtdColunasLinhas / 2))
    addMaterial("Impermeabilizante", 1)
  }

  /* ------------------ Parafuso sextavado ------------------ */
  if (!adicionouSextavado) {
    if (isMaoFrancesa) {
      const qtdMF = ROUND_INT(largura / 2)
      if (qtdMF > 0) addMaterial("Parafuso Sextavado", qtdMF * 3)
    } else {
      const qtdPontal = madeiraRaw
        .filter(m => m.componente === "Pontalete")
        .reduce((s, x) => s + x.quantidade, 0)

      const temLinhaParede = madeiraRaw.some(m => m.componente === "Linha na Parede")

      let qtdSextavado = 0
      if (qtdPontal) qtdSextavado += qtdPontal * 3
      if (temLinhaParede) qtdSextavado += ROUND_INT(largura)
      if (qtdSextavado > 0) addMaterial("Parafuso Sextavado", qtdSextavado + 2)
    }
  }

  /* ------------------ Telhas (descrições reais do banco) ------------------ */
  if (!/^(Pergolado|Caramanchão|Caramanhão de Eucalipto)/i.test(tipoNorm)) {
    const formulas = {
      Romana: { factor: 17, offset: 10 },
      SuperRomana: { factor: 12, offset: 10 },
      Americana: { factor: 12, offset: 10 },
      Colonial: { factor: 33, offset: 10 },
      Maxxi: { factor: 8, offset: 10 },
    } as const

    ;(Object.keys(formulas) as TelhaNome[]).forEach(nome => {
      const { factor, offset } = formulas[nome]
      const qtd = ROUND_INT(area * factor + offset)

      // gera exatamente as descrições cadastradas (preço por descrição)
      telhaDescricoesPorTipoBase[nome].forEach(descricao => {
        telhasRaw.push({ descricao, componente: "", quantidade: qtd })
      })
    })
  }

  /* ------------------ Receitas fixas + Stain Variável ------------------ */
  try {
    const receitasFixas = await getReceitasFixas(tipoNorm)
    const idStainLegado = 9 // Hardcoded: Stain Proteção UV
    
    const ids = receitasFixas.map(r => r.material_id)
    const materiaisFixos = await getMateriaisByIds(ids, fornecedorId)

    receitasFixas.forEach(({ material_id, quantidade }) => {
      // Ignora o stain fixo antigo se estivermos usando o variável por cor
      if (material_id === idStainLegado) return 
      
      const material = materiaisFixos.find(m => m.id === material_id)
      if (material) {
        const jaExiste = materiaisRaw.some(m => m.descricao === material.descricao)
        if (!jaExiste) {
          materiaisRaw.push({ descricao: material.descricao, componente: "", quantidade: Number(quantidade) })
        }
      }
    })

    // Adiciona o Stain Variável
    if (corStain) {
      const qtdStain = tipoNorm.includes("Mão Francesa") ? 0.3 : 0.5
      addMaterial(`Stain ${corStain}`, qtdStain)
    }
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
    "mão francesa",
    "Linha na Parede",
    "Colunas Traseiras",
    "Colunas Frontais",
    "Coluna",
    "Pranchão",
    "Pontalete",
    "Travessa",
    "Pérgola",
    "Terças",
    "Terça",
    "barrote",
    "Caibros",
    "Ripas",
    "Beiral",
  ] as const

  type ComponenteOrdem = typeof ordemMadeira[number]
  const ordenarMadeiras = (a: MadeiraRow, b: MadeiraRow) => {
    const iA = ordemMadeira.indexOf(a.componente as ComponenteOrdem)
    const iB = ordemMadeira.indexOf(b.componente as ComponenteOrdem)
    return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB)
  }

  const madeiraAgrup = agrupar(madeiraRaw).sort(ordenarMadeiras) as MadeiraRow[]
  const materiaisAgrup = agrupar(materiaisRaw)
  const telhasAgrup = agrupar(telhasRaw)

  const descricoesBusca = [...madeiraAgrup, ...materiaisAgrup, ...telhasAgrup]
    .map(r => r.descricao)
    .filter((v, i, a) => a.indexOf(v) === i)

  let precos: MaterialRow[]
  try {
    precos = await getMateriaisByDescricoes(descricoesBusca, fornecedorId)
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
    preco_unitario:
      r.descricao === "Impermeabilizante"
        ? (mapaPrecos.get(r.descricao) ?? 0) * (qtdColunasLinhas || 0)
        : (mapaPrecos.get(r.descricao) ?? 0),
    ...(r.tamanho ? { tamanho: r.tamanho } : {}),
  })

  return {
    madeira: madeiraAgrup.map(toCalc),
    materiais: materiaisAgrup.map(toCalc),
    telhas: telhasAgrup.map(toCalc),
  }
}

/* ============================================================
 *          IMPLEMENTAÇÃO – COBERTA EM L (coluna na frente)
 * ============================================================ */
export async function calcularMateriaisCobertaL(
  tipoBase: string,
  LMaior: number,
  CMaior: number,
  LMenor: number,
  CMenor: number,
  fornecedorId: number,
  opts?: {
    comLinhaNaParede?: boolean
    corStain?: string | null
  },
): Promise<Resultado> {
  if (!tipoBase || !LMaior || !CMaior || !LMenor || !CMenor) {
    throw new Error("Parâmetros obrigatórios da Coberta em L não informados.")
  }

  const comLinhaNaParede = Boolean(opts?.comLinhaNaParede)

  console.log("[calcularMateriaisCobertaL] INICIO:", {
    tipoBase,
    fornecedorId,
    LMaior,
    CMaior,
    LMenor,
    CMenor,
    comLinhaNaParede,
  })

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

  /* ---------- 0) Linha na parede (VARIANTE) ---------- */
  if (comLinhaNaParede) {
    add("Linha 10cm", "Linha na Parede", 1, LMaior)
  }

  /* ---------- 1) Pranchões ---------- */
  const qtdPranchaoMaior = comLinhaNaParede ? 1 : 2
  add("Linha 30cm", "Pranchão (maior)", qtdPranchaoMaior, LMaior)
  add("Linha 30cm", "Pranchão (menor)", 1, LMenor)

  /* ---------- 2) Pontaletes ---------- */
  const qtdPontaletes = comLinhaNaParede ? 3 : 5
  add(PONTALETE_DESCRICAO, "Pontalete", qtdPontaletes, 2.5)

  /* ---------- 3) Terças (L) ---------- */
  const tipoTercaL = "Linha 11,5cm"
  const tercasMaior = ROUND_INT(Math.max(1, (LMaior - LMenor) + 2))
  const tercasMenor = ROUND_INT(Math.max(0, LMenor - 1))
  add(tipoTercaL, "Terça (maior)", tercasMaior, CMaior + 0.5)
  add(tipoTercaL, "Terça (menor)", tercasMenor, CMenor + 0.5)

  /* ---------- 4) Caibros ---------- */
  const caibrosMaior = ROUND_INT(Math.max(0, CMenor / 0.32 + 1))
  const caibrosMenor = ROUND_INT(Math.max(0, (CMaior - CMenor) / 0.32))
  add("Caibro", "Caibro (maior)", caibrosMaior, LMaior)
  add("Caibro", "Caibro (menor)", caibrosMenor, LMenor)

  /* ---------- 5) Beirais ---------- */
  add("Beiral Trab. 15cm", "Beiral (maior)", 1, LMaior + 0.5)
  add("Beiral Trab. 15cm", "Beiral (meio)", 1, (CMaior - CMenor) + 0.5)

  /* ---------- 6) Coluna fixa na Coberta em L ---------- */
  const qtdColunas = 1
  add(`Linha ${espessura}`, "Coluna", 2, 3.5)
  addMaterial("Parafusos Franceses", qtdColunas * 3 + 1)
  addMaterial("Cimento, Areia e Brita", ROUND_INT(qtdColunas / 2))
  addMaterial("Impermeabilizante", 1)

  /* ---------- 7) Parafuso Sextavado ---------- */
  const metrosLinhaParede = comLinhaNaParede ? ROUND_INT(LMaior) : 0
  const qtdSextavado = qtdPontaletes * 3 + metrosLinhaParede + 2
  addMaterial("Parafuso Sextavado", qtdSextavado)

  /* ---------- 8) Telhas (POR COR / descrições do banco) ---------- */
  const areaBaseL = calculateLShapeArea({
    larguraMaior: LMaior,
    larguraMenor: LMenor,
    comprimentoMaior: CMaior,
    comprimentoMenor: CMenor,
  })
  const areaComPerda = areaBaseL * 1.08

  const formulas = {
    Romana: { factor: 17, offset: 10 },
    SuperRomana: { factor: 12, offset: 10 },
    Americana: { factor: 12, offset: 10 },
    Colonial: { factor: 33, offset: 10 },
    Maxxi: { factor: 8, offset: 10 },
  } as const

  ;(Object.keys(formulas) as TelhaNome[]).forEach(nome => {
    const { factor, offset } = formulas[nome]
    const qtd = ROUND_INT(areaComPerda * factor + offset)

    telhaDescricoesPorTipoBase[nome].forEach(descricao => {
      telhasRaw.push({ descricao, componente: "", quantidade: qtd })
    })
  })

  /* ---------- 8.1) Stain Variável (L) ---------- */
  if (opts?.corStain) {
    addMaterial(`Stain ${opts.corStain}`, 0.5)
  }

  /* ---------- 8.2) Receitas fixas (L) ---------- */
  try {
    const receitasFixas = await getReceitasFixas(tipoBase)
    const idStainLegado = 9 // Hardcoded: Stain Proteção UV
    
    const ids = receitasFixas.map(r => r.material_id)
    const materiaisFixos = await getMateriaisByIds(ids, fornecedorId)

    for (const { material_id, quantidade } of receitasFixas) {
      // Ignora o stain fixo antigo se estivermos usando o variável por cor
      if (material_id === idStainLegado) continue 
      
      const material = materiaisFixos.find(m => m.id === material_id)
      if (material) {
        const jaExiste = materiaisRaw.some(m => m.descricao === material.descricao)
        if (!jaExiste) {
          materiaisRaw.push({ descricao: material.descricao, componente: "", quantidade: Number(quantidade) })
        }
      }
    }
  } catch (err) {
    console.error("[calcularMateriaisCobertaL] Erro ao carregar receitas fixas:", err)
  }

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

  const ordemMadeira = [
    "Linha na Parede",
    "Colunas Traseiras",
    "Colunas Frontais",
    "Coluna",
    "Pranchão",
    "Pranchão (maior)",
    "Pranchão (menor)",
    "Pontalete",
    "Travessa",
    "Pérgola",
    "Terças",
    "Terça (maior)",
    "Terça (menor)",
    "Caibros",
    "Caibro (maior)",
    "Caibro (menor)",
    "Beiral",
    "Beiral (maior)",
    "Beiral (meio)",
  ] as const

  type ComponenteOrdem = typeof ordemMadeira[number]
  const ordenarMadeiras = (a: MadeiraRow, b: MadeiraRow) => {
    const iA = ordemMadeira.indexOf(a.componente as ComponenteOrdem)
    const iB = ordemMadeira.indexOf(b.componente as ComponenteOrdem)
    return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB)
  }

  const madeiraAgrupOrd = agrupar(madeiraRaw).sort(ordenarMadeiras) as MadeiraRow[]
  const materiaisAgrup = agrupar(materiaisRaw)
  const telhasAgrup = agrupar(telhasRaw)

  const descricoesBuscaL = [...madeiraAgrupOrd, ...materiaisAgrup, ...telhasAgrup]
    .map(r => r.descricao)
    .filter((v, i, a) => a.indexOf(v) === i)

  let precosL: MaterialRow[]
  try {
    precosL = await getMateriaisByDescricoes(descricoesBuscaL, fornecedorId)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha ao buscar preços dos materiais."
    throw new Error(message)
  }

  const mapaPrecosL = new Map<string, number>(
    precosL.map(row => [row.descricao, Number(row.preco_unitario) || 0]),
  )

  const toCalcL = (r: BaseRow): MaterialCalculado => ({
    descricao: r.descricao,
    componente: r.componente,
    quantidade: r.quantidade,
    preco_unitario:
      r.descricao === "Impermeabilizante"
        ? (mapaPrecosL.get(r.descricao) ?? 0) * 1
        : (mapaPrecosL.get(r.descricao) ?? 0),
    ...(r.tamanho ? { tamanho: r.tamanho } : {}),
  })

  console.log("[calcularMateriaisCobertaL] RESULTADO madeiraRaw:", madeiraAgrupOrd)

  return {
    madeira: madeiraAgrupOrd.map(toCalcL),
    materiais: materiaisAgrup.map(toCalcL),
    telhas: telhasAgrup.map(toCalcL),
  }
}
