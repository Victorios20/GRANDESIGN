import type { TipoCategoria, TipoLancamento } from "@prisma/client"

type ReportBucket = "revenue" | "cost" | "expense" | "excluded"

export type FixedFinancialGroupName =
  | "Receita"
  | "Receita de Ajuste"
  | "Custos diretos"
  | "Despesas financeiras"
  | "Despesas operacionais"
  | "Despesa de ajuste"
  | "Distribui\u00e7\u00e3o de Lucros"
  | "Transfer\u00eancia"

export type FixedFinancialGroupConfig = {
  name: FixedFinancialGroupName
  tipo: TipoCategoria
  reportBucket: ReportBucket
  accountingLabel: "Receita" | "Custo" | "Despesa" | "Fora da DRE"
  defaultChildren: string[]
}

type CategoryLike = {
  nome: string
  tipo?: string | null
  categoria_pai_id?: number | null
  categoriaPai?: { nome: string } | null
  categoria_pai?: { nome: string } | null
}

export const FIXED_FINANCIAL_CATEGORY_GROUPS: FixedFinancialGroupConfig[] = [
  {
    name: "Receita",
    tipo: "RECEITA",
    reportBucket: "revenue",
    accountingLabel: "Receita",
    defaultChildren: ["Pagamento de Cliente", "Rendimento"],
  },
  {
    name: "Receita de Ajuste",
    tipo: "RECEITA",
    reportBucket: "revenue",
    accountingLabel: "Receita",
    defaultChildren: ["Receita de Ajuste"],
  },
  {
    name: "Custos diretos",
    tipo: "DESPESA",
    reportBucket: "cost",
    accountingLabel: "Custo",
    defaultChildren: [
      "Compra de Material",
      "Madeira",
      "Telha",
      "Frete",
      "Andaime",
      "M\u00e3o de Obra",
      "Estadia",
    ],
  },
  {
    name: "Despesas financeiras",
    tipo: "DESPESA",
    reportBucket: "expense",
    accountingLabel: "Despesa",
    defaultChildren: ["Taxa de Cart\u00e3o"],
  },
  {
    name: "Despesas operacionais",
    tipo: "DESPESA",
    reportBucket: "expense",
    accountingLabel: "Despesa",
    defaultChildren: [
      "Refei\u00e7\u00e3o",
      "Manuten\u00e7\u00e3o",
      "Imposto",
      "Tecnologia",
      "Marketing",
      "Materiais de escrit\u00f3rio",
      "Contabilidade",
      "Comiss\u00e3o",
      "Fardamento",
      "Folha de Pagamento",
      "Combust\u00edvel",
      "Brindes",
    ],
  },
  {
    name: "Despesa de ajuste",
    tipo: "DESPESA",
    reportBucket: "expense",
    accountingLabel: "Despesa",
    defaultChildren: ["Despesa de Ajuste"],
  },
  {
    name: "Distribui\u00e7\u00e3o de Lucros",
    tipo: "DESPESA",
    reportBucket: "excluded",
    accountingLabel: "Fora da DRE",
    defaultChildren: ["Retirada de Lucro"],
  },
  {
    name: "Transfer\u00eancia",
    tipo: "DESPESA",
    reportBucket: "excluded",
    accountingLabel: "Fora da DRE",
    defaultChildren: ["Transfer\u00eancia"],
  },
]

export const EXCLUDED_FINANCIAL_GROUP_NAMES = FIXED_FINANCIAL_CATEGORY_GROUPS
  .filter((group) => group.reportBucket === "excluded")
  .map((group) => group.name)

export const EXCLUDED_FINANCIAL_CATEGORY_NAMES = FIXED_FINANCIAL_CATEGORY_GROUPS
  .filter((group) => group.reportBucket === "excluded")
  .flatMap((group) => [group.name, ...group.defaultChildren])

export const FINANCIAL_COST_GROUP_NAMES = FIXED_FINANCIAL_CATEGORY_GROUPS
  .filter((group) => group.reportBucket === "cost")
  .map((group) => group.name)

export const FINANCIAL_COST_CATEGORY_NAMES = FIXED_FINANCIAL_CATEGORY_GROUPS
  .filter((group) => group.reportBucket === "cost")
  .flatMap((group) => group.defaultChildren)

export const FINANCIAL_EXPENSE_GROUP_NAMES = FIXED_FINANCIAL_CATEGORY_GROUPS
  .filter((group) => group.reportBucket === "expense")
  .map((group) => group.name)

export const FINANCIAL_EXPENSE_CATEGORY_NAMES = FIXED_FINANCIAL_CATEGORY_GROUPS
  .filter((group) => group.reportBucket === "expense")
  .flatMap((group) => group.defaultChildren)

const GROUP_MAP = new Map(
  FIXED_FINANCIAL_CATEGORY_GROUPS.map((group) => [group.name, group]),
)

export function getFixedFinancialGroups() {
  return FIXED_FINANCIAL_CATEGORY_GROUPS
}

export function getFixedFinancialGroup(name?: string | null) {
  return name ? GROUP_MAP.get(name as FixedFinancialGroupName) ?? null : null
}

export function isFixedFinancialGroupName(name?: string | null) {
  return Boolean(getFixedFinancialGroup(name))
}

export function resolveFinancialGroupName(category: CategoryLike) {
  const parentName = category.categoriaPai?.nome ?? category.categoria_pai?.nome ?? null

  if (parentName && isFixedFinancialGroupName(parentName)) {
    return parentName as FixedFinancialGroupName
  }

  if (!category.categoria_pai_id && isFixedFinancialGroupName(category.nome)) {
    return category.nome as FixedFinancialGroupName
  }

  return null
}

export function getFinancialGroupConfigForCategory(category: CategoryLike) {
  return getFixedFinancialGroup(resolveFinancialGroupName(category))
}

export function isOperationalFinancialCategory(category: CategoryLike) {
  return Boolean(category.categoria_pai_id) && Boolean(getFinancialGroupConfigForCategory(category))
}

export function sortOperationalCategoriesByGroup<T extends CategoryLike>(
  children: T[],
  groupName: FixedFinancialGroupName,
) {
  const group = getFixedFinancialGroup(groupName)
  const defaultOrder = new Map(
    (group?.defaultChildren ?? []).map((name, index) => [name, index]),
  )

  return [...children].sort((left, right) => {
    const leftIndex = defaultOrder.get(left.nome) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = defaultOrder.get(right.nome) ?? Number.MAX_SAFE_INTEGER

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }

    return left.nome.localeCompare(right.nome, "pt-BR", { sensitivity: "base" })
  })
}

export function isReceivableCategory(category: CategoryLike) {
  return (
    isOperationalFinancialCategory(category) &&
    getFinancialGroupConfigForCategory(category)?.reportBucket === "revenue"
  )
}

export function isPayableCategory(category: CategoryLike) {
  const group = getFinancialGroupConfigForCategory(category)

  if (!isOperationalFinancialCategory(category) || !group) {
    return false
  }

  return group.reportBucket === "cost" || group.reportBucket === "expense" || group.name === "Distribui\u00e7\u00e3o de Lucros"
}

export function isExcludedFinancialCategory(category: CategoryLike) {
  return getFinancialGroupConfigForCategory(category)?.reportBucket === "excluded"
}

export function isTransactionSelectableCategory(
  category: CategoryLike,
  transactionType: TipoLancamento | "RECEITA" | "DESPESA",
) {
  const group = getFinancialGroupConfigForCategory(category)

  if (!isOperationalFinancialCategory(category) || !group) {
    return false
  }

  if (transactionType === "RECEITA") {
    return group.reportBucket === "revenue"
  }

  return (
    group.reportBucket === "cost" ||
    group.reportBucket === "expense" ||
    group.name === "Distribui\u00e7\u00e3o de Lucros"
  )
}

export function isExpenseLikeCategoryType(tipo: TipoCategoria | string) {
  return tipo === "DESPESA" || tipo === "CUSTO"
}
