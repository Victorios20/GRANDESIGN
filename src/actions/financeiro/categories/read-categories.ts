import { prisma } from "@/lib/prisma"

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
        subcategorias: children.filter((child) => child.categoria_pai_id === parent.id),
    }))

    return tree
}

export async function getCategoriesFlat(activeOnly = true) {
    return await prisma.categoria.findMany({
        where: activeOnly ? { ativo: true } : undefined,
        include: categoryInclude,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
    })
}
