import { expect, test } from "vitest"
import { buildBalanceteTree, type BalanceteCategory, type BalanceteRawRow } from "@/lib/balancete-tree"

const categories: BalanceteCategory[] = [
  { id: 1, nome: "Receitas", tipo: "RECEITA", categoria_pai_id: null },
  { id: 2, nome: "Vendas", tipo: "RECEITA", categoria_pai_id: 1 },
  { id: 3, nome: "Despesas", tipo: "DESPESA", categoria_pai_id: null },
]

test("soma valores dos filhos no pai e calcula saldo_final", () => {
  const raw: BalanceteRawRow[] = [
    { categoria_id: 2, saldo_anterior: 100, creditos: 50, debitos: 0 },
  ]
  const tree = buildBalanceteTree(categories, raw, false)
  const receitas = tree.find((n) => n.categoria_id === 1)!
  expect(receitas.creditos).toBe(50)
  expect(receitas.saldo_anterior).toBe(100)
  expect(receitas.saldo_final).toBe(150)
  expect(receitas.subcontas).toHaveLength(1)
})

test("oculta nós zerados quando showEmpty=false", () => {
  const tree = buildBalanceteTree(categories, [], false)
  expect(tree).toHaveLength(0)
})

test("mostra nós zerados quando showEmpty=true", () => {
  const tree = buildBalanceteTree(categories, [], true)
  expect(tree.length).toBeGreaterThan(0)
})
