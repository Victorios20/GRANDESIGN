import { getFixedFinancialGroups } from "@/lib/financial/fixed-category-taxonomy"
import { prisma } from "@/lib/prisma"

export async function syncFixedFinancialCategoryTaxonomy() {
  const groups = getFixedFinancialGroups()

  for (const group of groups) {
    const existingParent = await prisma.categoria.findFirst({
      where: {
        nome: group.name,
        categoria_pai_id: null,
      },
    })

    const parent = existingParent
      ? await prisma.categoria.update({
          where: { id: existingParent.id },
          data: {
            tipo: group.tipo,
            ativo: true,
          },
        })
      : await prisma.categoria.create({
          data: {
            nome: group.name,
            tipo: group.tipo,
            ativo: true,
          },
        })

    const parentWasCreated = !existingParent

    for (const childName of group.defaultChildren) {
      const existingChild = await prisma.categoria.findFirst({
        where: {
          nome: childName,
          categoria_pai_id: parent.id,
        },
      })

      if (existingChild) {
        await prisma.categoria.update({
          where: { id: existingChild.id },
          data: {
            tipo: group.tipo,
          },
        })
        continue
      }

      if (!parentWasCreated) {
        continue
      }

      await prisma.categoria.create({
        data: {
          nome: childName,
          tipo: group.tipo,
          categoria_pai_id: parent.id,
          ativo: true,
        },
      })
    }
  }
}
