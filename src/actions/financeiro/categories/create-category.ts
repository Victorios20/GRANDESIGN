import { prisma } from "@/lib/prisma"
import { getFixedFinancialGroup } from "@/lib/financial/fixed-category-taxonomy"
import { createCategorySchema, type CreateCategoryInput } from "./schema"
import { syncFixedFinancialCategoryTaxonomy } from "./sync-fixed-taxonomy"

export async function createCategory(input: CreateCategoryInput) {
  const data = createCategorySchema.parse(input)

  await syncFixedFinancialCategoryTaxonomy()

  if (!data.categoria_pai_id) {
    throw new Error("A categoria deve ser vinculada a um grupo fixo")
  }

  const parent = await prisma.categoria.findUnique({
    where: { id: data.categoria_pai_id },
  })

  if (!parent) {
    throw new Error("Grupo nao encontrado")
  }

  if (parent.categoria_pai_id || !getFixedFinancialGroup(parent.nome)) {
    throw new Error("A categoria deve ser vinculada a um grupo fixo valido")
  }

  const normalizedName = data.nome.trim()

  const duplicate = await prisma.categoria.findFirst({
    where: {
      categoria_pai_id: parent.id,
      nome: {
        equals: normalizedName,
        mode: "insensitive",
      },
    },
  })

  if (duplicate) {
    throw new Error("Ja existe uma categoria com essa descricao neste grupo")
  }

  return prisma.categoria.create({
    data: {
      nome: normalizedName,
      tipo: parent.tipo,
      cor: data.cor,
      icone: data.icone,
      categoria_pai_id: parent.id,
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
