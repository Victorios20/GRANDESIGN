/* ────────────────────────────────────────────────────────────────
   Função de cálculo GRANDESIGN (Next.js + Supabase)
   Retorna lista de materiais: fixos + variáveis (madeira, telhas, extras)
───────────────────────────────────────────────────────────────── */
import {
  getReceitasFixas,
  getMateriaisByIds,
  getMateriaisByDescricoes,
  type MaterialRow,
  type TipoMaterial,
} from "./calcularMateriais-db"

/* ============= Tipos de saída ============= */
export interface MaterialCalculado {
  id: number | null
  descricao: string
  tipo: TipoMaterial | null
  unidade: string | null
  quantidade: number
  preco_unitario: number
  total: number
  tamanho?: string
}

/* ============= Utils ============= */
const ceil = Math.ceil

/* ---------------- tipos internos ---------------- */
type MadeiraItem = { descricao: string; quantidade: number }

/* ============= MADEIRA ============= */
function calcularMadeira(
  tipoObra: string,
  largura: number,
  comprimento: number,
): MadeiraItem[] {
  const madeira: MadeiraItem[] = []
  let quantidadeBrabo = comprimento >= 6 ? 3 : 2

  const caibros = ceil(comprimento / 0.32) + 1
  const tercas = ceil(largura) + 1
  const espessuraBrabo = largura > 5.5 ? 30 : comprimento >= 6 ? 30 : 25
  const descricaoBrabo = `Linha ${espessuraBrabo}cm (Pranchão)`
  const descricaoBeiral = tipoObra.includes("11,5")
    ? "Beiral Trab. 11,5cm"
    : "Beiral Trab. 15cm"
  const descricaoPontalete = tipoObra.includes("11,5")
    ? "Linha 11,5cm (Pontalete)"
    : "Linha 15cm (Pontalete)"
  const descricaoTerça = "Linha 11,5cm (Terças)"

  /* --- Coluna 15 / 11,5 --- */
  if (tipoObra === "Coluna 15" || tipoObra === "Coluna 11,5") {
    const esp = tipoObra.endsWith("15") ? "15cm" : "11,5cm"
    madeira.push(
      { descricao: `Linha ${esp} (Colunas Traseiras)`, quantidade: 4 },
      {
        descricao: `Linha ${esp} (Colunas Frontais)`,
        quantidade: comprimento >= 6 ? 8 : 4,
      },
    )
  }

  /* --- Pontalete --- */
  if (tipoObra.startsWith("Pontalete")) {
    madeira.push({
      descricao: descricaoPontalete,
      quantidade: quantidadeBrabo * 2,
    })
  }

  /* --- Linha na Parede --- */
  if (
    tipoObra.toLowerCase() === "linha na parede 15" ||
    tipoObra.toLowerCase() === "linha na parede 11,5"
  ) {
    quantidadeBrabo -= 1
    madeira.push({
      descricao: "Linha 11,5cm (Parede)",
      quantidade: 1,
    })
  }

  /* --- Linha na Parede + Coluna --- */
  if (tipoObra.startsWith("Linha na Parede + Coluna")) {
    const esp = tipoObra.endsWith("15") ? "15cm" : "11,5cm"
    const qtdLinhasColuna = comprimento >= 6 ? 8 : 4
    madeira.push(
      { descricao: "Linha 11,5cm (Parede)", quantidade: 1 },
      { descricao: `Linha ${esp} (Coluna)`, quantidade: qtdLinhasColuna },
    )
  }

  /* --- Caramanchão / Pergolado --- */
  if (tipoObra.startsWith("Caramanchão") || tipoObra.startsWith("Pergolado")) {
    const esp = tipoObra.endsWith("15") ? "15cm" : "11,5cm"
    const base = `Linha ${esp}`
    if (tipoObra.startsWith("Caramanchão")) {
      madeira.push(
        { descricao: `${base} (Colunas Traseiras)`, quantidade: 4 },
        {
          descricao: `${base} (Colunas Frontais)`,
          quantity: comprimento > 6 ? 8 : 4,
        } as any,
        { descricao: `${base} (Travessa)`, quantidade: 2 },
        {
          descricao: `${base} (Pérgola)`,
          quantidade: ceil(comprimento / 0.35) + 1,
        },
      )
    } else {
      /* Pergolado */
      madeira.push(
        { descricao: `${base} (Travessa)`, quantidade: 2 },
        {
          descricao: `${base} (Pérgola)`,
          quantidade: ceil(comprimento / 0.35) + 1,
        },
      )
    }
  }

  /* --- Itens comuns (terças, caibros, brabo, beiral) --- */
  madeira.push(
    { descricao: descricaoTerça, quantidade: tercas },
    { descricao: "Caibros", quantidade: caibros },
    { descricao: descricaoBrabo, quantidade: quantidadeBrabo },
    { descricao: descricaoBeiral, quantidade: 1 },
  )

  return madeira
}

/* ============= MATERIAIS VARIÁVEIS (extras) ============= */
function calcularMateriaisVariaveis(
  madeira: MadeiraItem[],
  tipoObra: string,
  largura: number,
): MadeiraItem[] {
  const materiais: MadeiraItem[] = []

  /* identificar colunas */
  const linhasColuna = madeira.reduce((acc, item) => {
    const desc = item.descricao.toLowerCase()
    return desc.includes("linha") && desc.includes("coluna")
      ? acc + item.quantidade
      : acc
  }, 0)
  const temColunas = linhasColuna > 0
  const qtdColunas = temColunas ? linhasColuna / 2 : 0

  if (temColunas) {
    materiais.push(
      { descricao: "Parafusos Franceses", quantidade: qtdColunas * 3 + 3 },
      { descricao: "Cimento, Areia e Brita", quantidade: ceil(qtdColunas / 2) },
    )
  }

  let qtdSextavado = 0
  const pontalete = madeira.find((m) =>
    m.descricao.toLowerCase().includes("pontalete"),
  )
  if (pontalete) qtdSextavado += pontalete.quantidade * 3

  const linhaParede = madeira.find((m) =>
    m.descricao.toLowerCase().includes("parede"),
  )
  if (linhaParede) qtdSextavado += ceil(largura)

  if (qtdSextavado > 0) {
    materiais.push({
      descricao: "Parafuso Sextavado",
      quantidade: qtdSextavado + 2,
    })
  }

  if (tipoObra.toLowerCase().startsWith("linha na parede")) {
    materiais.push(
      { descricao: "Rufo", quantidade: ceil(largura) },
      { descricao: "Silicone PU", quantidade: ceil(largura / 2.5) },
    )
  }

  return materiais
}

/* ============= TELHAS ============= */
function calcularTelhas(
  tipoObra: string,
  largura: number,
  comprimento: number,
): MadeiraItem[] {
  if (tipoObra.startsWith("Pergolado") || tipoObra.startsWith("Caramanchão"))
    return []

  const area = largura * comprimento
  const formulas = {
    Romana: { factor: 17, offset: 40 },
    Americana: { factor: 12, offset: 40 },
    Colonial: { factor: 33, offset: 50 },
  } as const

  return Object.entries(formulas).map(([descricao, { factor, offset }]) => ({
    descricao: `Telha ${descricao}`,
    quantidade: ceil(area * factor + offset),
  }))
}

/* ============= MAIN ============= */
export async function calcularMateriais(
  tipoObra: string,
  largura: number,
  comprimento: number,
): Promise<MaterialCalculado[]> {
  const madeira = calcularMadeira(tipoObra, largura, comprimento)
  const extras = calcularMateriaisVariaveis(madeira, tipoObra, largura)
  const telhas = calcularTelhas(tipoObra, largura, comprimento)
  const fixosDB = await getReceitasFixas(tipoObra)

  /* construir dicionário quantidade */
  const mapQtd = new Map<string | number, number>()
  const add = (k: string | number, q: number) =>
    mapQtd.set(k, (mapQtd.get(k) ?? 0) + q)

  madeira.forEach((m) => add(m.descricao, m.quantidade))
  extras.forEach((m) => add(m.descricao, m.quantidade))
  telhas.forEach((m) => add(m.descricao, m.quantidade))
  fixosDB.forEach((f) => add(f.material_id, f.quantidade))

  /* buscar infos no banco */
  const ids = fixosDB.map((f) => f.material_id)
  const descricoes = [...mapQtd.keys()].filter(
    (k) => typeof k === "string",
  ) as string[]

  const [infoIds, infoDesc] = await Promise.all([
    getMateriaisByIds(ids),
    getMateriaisByDescricoes(descricoes),
  ])

  const infoAll: MaterialRow[] = [...infoIds, ...infoDesc]
  const infoById = new Map(infoAll.map((r) => [r.id, r]))
  const infoByDesc = new Map(
    infoAll.map((r) => [r.descricao.toLowerCase(), r]),
  )

  /* montar resultado final */
  const resultado: MaterialCalculado[] = []

  for (const [key, qtd] of mapQtd) {
    let row: MaterialRow | undefined
    if (typeof key === "number") {
      row = infoById.get(key)
    } else {
      row = infoByDesc.get(key.toLowerCase())
    }

    if (row) {
      const total = Number(row.preco_unitario) * qtd
      resultado.push({
        id: row.id,
        descricao: row.descricao,
        tipo: row.tipo,
        unidade: row.unidade,
        quantidade: qtd,
        preco_unitario: Number(row.preco_unitario),
        total,
      })
    } else {
      resultado.push({
        id: null,
        descricao: key.toString(),
        tipo: null,
        unidade: null,
        quantidade: qtd,
        preco_unitario: 0,
        total: 0,
      })
    }
  }

  resultado.sort((a, b) => a.descricao.localeCompare(b.descricao))
  return resultado
}
