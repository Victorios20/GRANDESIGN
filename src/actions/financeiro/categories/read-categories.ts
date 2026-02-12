import { prisma } from "@/lib/prisma"

export async function getCategoriesTree() {
    const allCategories = await prisma.categoria.findMany({
        where: { ativo: true },
        orderBy: { nome: "asc" },
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

export async function getCategoriesFlat() {
    return await prisma.categoria.findMany({
        where: { ativo: true },
        orderBy: { nome: "asc" },
    })
}
