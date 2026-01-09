/* ----------------------------------------------
   GRANDESIGN – calcularMateriais.ts (com dispatcher)
   ---------------------------------------------- */
import {
  getMateriaisByDescricoes,
  getMateriaisByIds,
  getReceitasFixas,
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

const ceil = Math.ceil
const HALF = 0.5
const ROUND_HALF = (v: number) => ceil(v / HALF) * HALF
const ROUND_INT = (v: number) => ceil(v)
const toStr = (v: number) => v.toFixed(1).replace(".", ",")

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
 *  PONTO DE ENTRADA PÚBLICO – dispatcher
 *  calcularMateriais(tipoObra, largura, comprimento, opts?)
 * ============================================================ */
export async function calcularMateriais(
  tipoObra: string,
  largura?: number,
  comprimento?: number,
  opts?: ({ fornecedorId: number } & Partial<CobertaLOpts>),
): Promise<Resultado> {
  const tipoNorm = (tipoObra ?? "").replace(/\u00A0/g, " ").trim()
  const fornecedorId = opts?.fornecedorId
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
    })

    return calcularMateriaisCobertaL(
      tipoBase,
      L.LMaior,
      L.CMaior,
      L.LMenor,
      L.CMenor,
      fornecedorId,
      { comLinhaNaParede },
    )
  }

  // Fluxo normal (compatível com chamadas antigas)
  if (!tipoObra || !largura || !comprimento) {
    throw new Error("Parâmetros obrigatórios: tipoObra, largura, comprimento")
  }
  return calcularMateriaisNormal(tipoNorm, largura, comprimento, fornecedorId)
}

/* ============================================================
 *                IMPLEMENTAÇÃO – OBRA NORMAL
 * ============================================================ */
async function calcularMateriaisNormal(
  tipoNorm: string,
  largura: number,
  comprimento: number,
  fornecedorId: number,
): Promise<Resultado> {
  const madeiraRaw: MadeiraRow[] = []
  const materiaisRaw: BaseRow[] = []
  const telhasRaw: BaseRow[] = []

  // Flag para evitar duplicar sextavado quando já for calculado em casos específicos
  let adicionouSextavado = false

  const area = largura * ROUND_HALF(comprimento + 0.5)
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
  const isCorredorQuedaFrontal = /^Corredor Queda Frontal/i.test(tipoNorm)
  const isCorredorQueda = isCorredorQuedaLateral || isCorredorQuedaFrontal
  const isMaoFrancesa = /^Mão Francesa/i.test(tipoNorm)

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
      add(`Linha ${espessura}`, "Pontalete", pranchaoBase * 2, 2.5)
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

    case /^Corredor Queda Frontal/i.test(tipoNorm): {
      // 1) Terças adicionais (a cada 1m no comprimento): Linha 11,5cm de 1,0m
      const qtdTercas = Math.max(0, ROUND_INT(comprimento))
      add("Linha 11,5cm", "Terça", qtdTercas, 1.0)

      // 2) Parafuso sextavado para essas terças: 2 por peça + 2 de sobra
      const qtdSext = qtdTercas * 2 + 2
      if (qtdSext > 0) {
        addMaterial("Parafuso Sextavado", qtdSext)
        adicionouSextavado = true
      }
      break
    }

    // ===== MÃO FRANCESA =====
    case /^Mão Francesa/i.test(tipoNorm): {
      // Regras confirmadas:
      // - Quantidade: ceil(largura / 2) (sem extremidades), espaçamento ao longo da largura
      // - NÃO adiciona beiral aqui
      // - 3 peças por mão francesa, descrição Pontalete (tamanhos proporcionais ao comprimento útil)
      // - 2 barrotes (linha parede + extremidade) para o telhado inteiro, tamanho = largura
      // - 1 barrote inclinado único: comprimento * 1,30
      // - barrotes das telhas calculados pelo comprimento linear (ceil(comprimento))

      const qtdMF = ROUND_INT(largura / 2)

      // 3 peças por mão francesa (tamanhos fixos)
      // Obs: componente deve ser estritamente existente: usa "Pontalete"
      add("Linha 15cm", "Mão francesa", qtdMF, 2)
      add("Linha 15cm", "Mão francesa", qtdMF, 2)
      add("Linha 15cm", "Mão francesa", qtdMF, 1.5)

      // 2 barrotes do telhado inteiro (parede + extremidade) - sem criar novo componente
      // Usa "Terças" (já existente) para classificar como estrutura
      add("Barrote", "barrote", 2, largArred)

      // Barrote inclinado único (30%)
      add("Barrote", "barrote", qtdMF, ROUND_HALF(comprimento * 1.3))

      // Barrotes que seguram telha: a cada 0,32m no comprimento linear
      const compLinear = ROUND_INT(comprimento)
      const qtdBarrotesTelha = ROUND_INT(compLinear / 0.32) + 1
      add("Barrote", "barrote", qtdBarrotesTelha, largArred)

      break
    }

    default:
      throw new Error(`Tipo de obra não reconhecido: ${tipoNorm}`)
  }

  /* ------------------ Madeira comum ------------------ */
  // IMPORTANTE: Mão Francesa não entra no bloco comum (evita pranchão/terças/caibro/beiral automáticos)
  if (!/^(Pergolado|Caramanchão|Mão Francesa)/i.test(tipoNorm)) {
    const isCaibroRipaBase = /^Caibro e Ripa/i.test(tipoNorm)
    const isCaibroRipa = isCaibroRipaBase || isCorredorQueda // corredores seguem lógica de caibro e ripa
    const isLinhaParede = /^Linha na Parede(?! \+ Coluna)/i.test(tipoNorm)
    const isLinhaParedeComCol = /^Linha na Parede \+ Coluna/i.test(tipoNorm)

    // ===== PRANCHÃO =====
    // Regra NOVA: nos corredores queda (lateral/frontal), NÃO vai pranchão nem pontalete
    if (isCaibroRipa) {
      if (!isCorredorQueda) {
        // Pranchão 25 cm a cada 2 m (sem limitação de quantidade)
        const qtdPranchao20 = ROUND_INT(comprimento / 2)
        if (qtdPranchao20 > 0) add("Linha 25cm", "Pranchão", qtdPranchao20, largArred)

        // 2 pontaletes por pranchão (sem limite)
        const qtdPontalete = qtdPranchao20 * 2
        if (qtdPontalete > 0) add(`Linha ${espessura}`, "Pontalete", qtdPontalete, 2.5)
      }
    } else {
      const pranchaoBase = comprimento >= 6 ? 3 : 2
      const pranchaoEfetivo = (isLinhaParede || isLinhaParedeComCol)
        ? Math.max(0, pranchaoBase - 1)
        : pranchaoBase
      if (pranchaoEfetivo > 0) add("Linha 30cm", "Pranchão", pranchaoEfetivo, largArred)
    }

    // ===== PONTALETE =====
    if (!isCaibroRipa && isLinhaParede) {
      const pranchaoBase = comprimento >= 6 ? 3 : 2
      const pranchaoEfetivoLP = Math.max(0, pranchaoBase - 1)
      if (pranchaoEfetivoLP > 0) add(`Linha ${espessura}`, "Pontalete", pranchaoEfetivoLP * 2, 2.5)
    }

    // ===== TERÇAS =====
    // não aplica para Caibro e Ripa (inclui corredores)
    if (!isCaibroRipa) {
      let tipoTerca = "Linha 11,5cm"
      const hasThreePranchao = (comprimento >= 6)
      if (comprimento > 4.5) {
        tipoTerca = (hasThreePranchao && comprimento <= 7)
          ? "Linha 11,5cm"
          : "Linha 15cm"
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
    addMaterial("Impermeabilizante", 1)
  }

  /* ------------------ Parafuso sextavado ------------------ */
  if (!adicionouSextavado) {
    // REGRA ESPECIAL – MÃO FRANCESA:
    // parafuso sextavado = 3 x quantidade de mãos francesas
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

  /* ------------------ Telhas ------------------ */
  if (!/^(Pergolado|Caramanchão)/i.test(tipoNorm)) {
    const formulas = {
      Romana: { factor: 17, offset: 10 },
      Americana: { factor: 12, offset: 10 },
      Colonial: { factor: 33, offset: 10 },
      Maxxi: { factor: 8, offset: 10 },
    } as const

    ;(Object.keys(formulas) as (keyof typeof formulas)[]).forEach(nome => {
      const { factor, offset } = formulas[nome]
      const qtd = ROUND_INT(area * factor + offset)
      telhasRaw.push({ descricao: nome, componente: "", quantidade: qtd })
    })
  }

  /* ------------------ Receitas fixas ------------------ */
  try {
    const receitasFixas = await getReceitasFixas(tipoNorm)
    const ids = receitasFixas.map(r => r.material_id)
    const materiaisFixos = await getMateriaisByIds(ids, fornecedorId)
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
  opts?: { comLinhaNaParede?: boolean },
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
  // Obs: por padrão eu usei LMenor como “comprimento” da linha na parede.
  // Se na sua regra for LMaior, troque LMenor por LMaior aqui.
  if (comLinhaNaParede) {
    add("Linha 10cm", "Linha na Parede", 1, LMaior)
  }

  /* ---------- 1) Pranchões ---------- */
  // Base: total 3 (2 no maior, 1 no menor)
  // Variante com linha na parede: remove 1 pranchão MAIOR (fica 1 no maior, mantém 1 no menor)
  const qtdPranchaoMaior = comLinhaNaParede ? 1 : 2
  add("Linha 30cm", "Pranchão (maior)", qtdPranchaoMaior, LMaior)

  add("Linha 30cm", "Pranchão (menor)", 1, LMenor)

  /* ---------- 2) Pontaletes ---------- */
  // Base: fixo = 5 (2,5 m)
  // Variante com linha na parede: remove 2 => 3
  const qtdPontaletes = comLinhaNaParede ? 3 : 5
  add(`Linha ${espessura}`, "Pontalete", qtdPontaletes, 2.5)

  /* ---------- 3) Terças (L) ---------- */
  const tipoTercaL = "Linha 11,5cm"
  const tercasMaior = ROUND_INT(Math.max(1, (LMaior - LMenor) + 2))
  const tercasMenor = ROUND_INT(Math.max(0, LMenor - 1))
  add(tipoTercaL, "Terça (maior)", tercasMaior, CMaior + 0.5)
  add(tipoTercaL, "Terça (menor)", tercasMenor, CMenor + 0.5)

  /* ---------- 4) Caibros ---------- */
  const caibrosMaior = ROUND_INT(Math.max(0, (CMenor) / 0.32 + 1))
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
  // Regra: 3 parafusos por pontalete + 1 por metro da linha na parede (usando a largura total da obra)
  // Mantive a sobra +2 como estava.
  const metrosLinhaParede = comLinhaNaParede ? ROUND_INT(LMaior) : 0

  const qtdSextavado = (qtdPontaletes * 3) + metrosLinhaParede + 2
  addMaterial("Parafuso Sextavado", qtdSextavado)

  /* ---------- 8) Telhas: Área1 + Área2, com 8% de perda por recorte ---------- */
  const area1 = CMenor * LMaior
  const area2 = (CMaior - CMenor) * LMenor
  const areaComPerda = (area1 + area2) * 1.08

  const formulas = {
    Romana: { factor: 17, offset: 10 },
    Americana: { factor: 12, offset: 10 },
    Colonial: { factor: 33, offset: 10 },
    Maxxi: { factor: 8, offset: 10 },
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
