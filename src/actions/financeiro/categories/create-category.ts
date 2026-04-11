import { prisma } from "@/lib/prisma"
import { createCategorySchema, CreateCategoryInput } from "./schema"

export async function createCategory(input: CreateCategoryInput) {
    const data = createCategorySchema.parse(input)

    // Validate Parent
    if (data.categoria_pai_id) {
        const parent = await prisma.categoria.findUnique({
            where: { id: data.categoria_pai_id },
        })

        if (!parent) {
            throw new Error("Categoria pai não encontrada")
        }

        if (parent.categoria_pai_id) {
            throw new Error("Não é permitido criar subcategoria de terceiro nível")
        }

        if (parent.tipo !== data.tipo) {
            throw new Error("Subcategoria deve ter o mesmo tipo da categoria pai")
        }
    }

    return await prisma.categoria.create({
        data: {
            nome: data.nome,
            tipo: data.tipo,
            cor: data.cor,
            icone: data.icone,
            categoria_pai_id: data.categoria_pai_id,
            ativo: true,
        },
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
