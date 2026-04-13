import { prisma } from "@/lib/prisma"
import {
    getFixedFinancialGroups,
    getFixedFinancialGroup,
    sortOperationalCategoriesByGroup,
} from "@/lib/financial/fixed-category-taxonomy"
import { syncFixedFinancialCategoryTaxonomy } from "./sync-fixed-taxonomy"

const categoryInclude = {
    categoria_pai: {
        select: {
            id: true,
            nome: true,
        },
    },
    _count: {
        select: {
            subcategorias: true,
            lancamentos: true,
            contas_pagar: true,
            contas_receber: true,
        },
    },
} as const

export async function getCategoriesTree(activeOnly = true) {
    await syncFixedFinancialCategoryTaxonomy()

    const allCategories = await prisma.categoria.findMany({
        where: activeOnly ? { ativo: true } : undefined,
        include: categoryInclude,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
    })

    // Separate parents and children
    const parents = allCategories.filter((c) => !c.categoria_pai_id)
    const children = allCategories.filter((c) => c.categoria_pai_id)

    // Attach children to parents
    const tree = parents.map((parent) => ({
        ...parent,
        subcategorias: sortOperationalCategoriesByGroup(
            children.filter((child) => child.categoria_pai_id === parent.id),
            parent.nome as ReturnType<typeof getFixedFinancialGroups>[number]["name"],
        ),
    }))

    const fixedGroupOrder = new Map<string, number>(
        getFixedFinancialGroups().map((group, index) => [group.name, index]),
    )

    return tree.sort((left, right) => {
        const leftIndex = fixedGroupOrder.get(left.nome) ?? Number.MAX_SAFE_INTEGER
        const rightIndex = fixedGroupOrder.get(right.nome) ?? Number.MAX_SAFE_INTEGER

        if (leftIndex !== rightIndex) {
            return leftIndex - rightIndex
        }

        return left.nome.localeCompare(right.nome, "pt-BR", { sensitivity: "base" })
    })
}

export async function getCategoriesFlat(activeOnly = true) {
    await syncFixedFinancialCategoryTaxonomy()

    const categories = await prisma.categoria.findMany({
        where: activeOnly ? { ativo: true } : undefined,
        include: categoryInclude,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
    })

    const fixedGroupOrder = new Map<string, number>(
        getFixedFinancialGroups().map((group, index) => [group.name, index]),
    )

    return categories.sort((left, right) => {
        const leftGroupName = left.categoria_pai?.nome ?? left.nome
        const rightGroupName = right.categoria_pai?.nome ?? right.nome
        const leftIndex = fixedGroupOrder.get(leftGroupName) ?? Number.MAX_SAFE_INTEGER
        const rightIndex = fixedGroupOrder.get(rightGroupName) ?? Number.MAX_SAFE_INTEGER

        if (leftIndex !== rightIndex) {
            return leftIndex - rightIndex
        }

        const leftIsGroup = !left.categoria_pai_id && getFixedFinancialGroup(left.nome)
        const rightIsGroup = !right.categoria_pai_id && getFixedFinancialGroup(right.nome)

        if (leftIsGroup && !rightIsGroup) return -1
        if (!leftIsGroup && rightIsGroup) return 1

        return left.nome.localeCompare(right.nome, "pt-BR", { sensitivity: "base" })
    })
}
