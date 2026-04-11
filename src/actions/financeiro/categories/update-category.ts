import { prisma } from "@/lib/prisma"
import { updateCategorySchema, UpdateCategoryInput } from "./schema"

export async function updateCategory(input: UpdateCategoryInput) {
    const { id, ...data } = updateCategorySchema.parse(input)

    return await prisma.categoria.update({
        where: { id },
        data,
        include: {
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
        },
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
        include: {
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
        },
    })
}
