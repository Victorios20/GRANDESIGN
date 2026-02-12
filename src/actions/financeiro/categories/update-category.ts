import { prisma } from "@/lib/prisma"
import { updateCategorySchema, UpdateCategoryInput } from "./schema"

export async function updateCategory(input: UpdateCategoryInput) {
    const { id, ...data } = updateCategorySchema.parse(input)

    return await prisma.categoria.update({
        where: { id },
        data,
    })
}

export async function deleteCategory(id: number) {
    // Soft Delete
    // Check if it has active children
    const hasChildren = await prisma.categoria.count({
        where: { categoria_pai_id: id, ativo: true },
    })

    if (hasChildren > 0) {
        throw new Error("Não é possível desativar categoria com subcategorias ativas")
    }

    return await prisma.categoria.update({
        where: { id },
        data: { ativo: false },
    })
}
