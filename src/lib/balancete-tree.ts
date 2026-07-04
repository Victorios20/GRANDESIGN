import type { BalanceteItem } from "@/types/financeiro"

export type BalanceteCategory = {
  id: number
  nome: string
  tipo: string
  categoria_pai_id: number | null
}

export type BalanceteRawRow = {
  categoria_id: number
  saldo_anterior: unknown
  creditos: unknown
  debitos: unknown
}

const toNum = (val: unknown) => Number(val ?? 0)

export function buildBalanceteTree(
  categories: BalanceteCategory[],
  rawData: BalanceteRawRow[],
  showEmpty: boolean,
): BalanceteItem[] {
  const categoryMap = new Map<number, BalanceteItem>()

  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      categoria_id: cat.id,
      nome: cat.nome,
      tipo: cat.tipo === "RECEITA" ? "Receita" : "Despesa",
      nivel: cat.categoria_pai_id ? 2 : 1,
      saldo_anterior: 0,
      creditos: 0,
      debitos: 0,
      saldo_final: 0,
      subcontas: [],
    })
  })

  rawData.forEach((row) => {
    const item = categoryMap.get(row.categoria_id)
    if (item) {
      item.saldo_anterior = toNum(row.saldo_anterior)
      item.creditos = toNum(row.creditos)
      item.debitos = toNum(row.debitos)
      item.saldo_final = item.saldo_anterior + item.creditos - item.debitos
    }
  })

  const roots: BalanceteItem[] = []
  const childrenMap = new Map<number, BalanceteItem[]>()

  categories.forEach((cat) => {
    const item = categoryMap.get(cat.id)!
    if (cat.categoria_pai_id) {
      if (!childrenMap.has(cat.categoria_pai_id)) childrenMap.set(cat.categoria_pai_id, [])
      childrenMap.get(cat.categoria_pai_id)?.push(item)
    } else {
      roots.push(item)
    }
  })

  const processNode = (node: BalanceteItem): boolean => {
    const children = childrenMap.get(node.categoria_id) || []
    let computedSaldoAnt = node.saldo_anterior
    let computedCreditos = node.creditos
    let computedDebitos = node.debitos
    const activeChildren: BalanceteItem[] = []

    for (const child of children) {
      const hasData = processNode(child)
      computedSaldoAnt += child.saldo_anterior
      computedCreditos += child.creditos
      computedDebitos += child.debitos
      if (showEmpty || hasData) activeChildren.push(child)
    }

    node.saldo_anterior = computedSaldoAnt
    node.creditos = computedCreditos
    node.debitos = computedDebitos
    node.saldo_final = computedSaldoAnt + computedCreditos - computedDebitos
    node.subcontas = activeChildren

    return (
      Math.abs(node.saldo_anterior) > 0.001 ||
      Math.abs(node.creditos) > 0.001 ||
      Math.abs(node.debitos) > 0.001
    )
  }

  return roots.filter((root) => {
    const hasData = processNode(root)
    return showEmpty || hasData
  })
}
