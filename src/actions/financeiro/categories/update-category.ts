import { prisma } from "@/lib/prisma"
import { getFixedFinancialGroup, isOperationalFinancialCategory } from "@/lib/financial/fixed-category-taxonomy"
import { updateCategorySchema, type UpdateCategoryInput } from "./schema"
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

export async function updateCategory(input: UpdateCategoryInput) {
  const { id, categoria_pai_id, nome, tipo, ...data } = updateCategorySchema.parse(input)

  await syncFixedFinancialCategoryTaxonomy()

  const existing = await prisma.categoria.findUnique({
    where: { id },
    include: {
      categoria_pai: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Categoria nao encontrada")
  }

  if (!isOperationalFinancialCategory(existing)) {
    throw new Error("Os grupos fixos do sistema nao podem ser editados")
  }

  const nextParentId = categoria_pai_id ?? existing.categoria_pai_id
  let nextType = tipo ?? existing.tipo

  if (!nextParentId) {
    throw new Error("A categoria deve permanecer vinculada a um grupo fixo")
  }

  const parent = await prisma.categoria.findUnique({
    where: { id: nextParentId },
  })

  if (!parent || parent.categoria_pai_id || !getFixedFinancialGroup(parent.nome)) {
    throw new Error("Grupo invalido")
  }

  nextType = parent.tipo

  if (nome) {
    const duplicate = await prisma.categoria.findFirst({
      where: {
        id: { not: id },
        categoria_pai_id: parent.id,
        nome: {
          equals: nome.trim(),
          mode: "insensitive",
        },
      },
    })

    if (duplicate) {
      throw new Error("Ja existe uma categoria com essa descricao neste grupo")
    }
  }

  return prisma.categoria.update({
    where: { id },
    data: {
      ...data,
      nome: nome?.trim(),
      categoria_pai_id: parent.id,
      tipo: nextType,
    },
    include: categoryInclude,
  })
}

export async function deleteCategory(id: number) {
  await syncFixedFinancialCategoryTaxonomy()

  const category = await prisma.categoria.findUnique({
    where: { id },
    include: {
      categoria_pai: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  })

  if (!category) {
    throw new Error("Categoria nao encontrada")
  }

  if (!isOperationalFinancialCategory(category)) {
    throw new Error("Os grupos fixos do sistema nao podem ser excluidos")
  }

  const hasChildren = await prisma.categoria.count({
    where: { categoria_pai_id: id, ativo: true },
  })

  if (hasChildren > 0) {
    throw new Error("Nao e possivel excluir categoria com subcategorias ativas")
  }

  return prisma.categoria.update({
    where: { id },
    data: { ativo: false },
    include: categoryInclude,
  })
}
