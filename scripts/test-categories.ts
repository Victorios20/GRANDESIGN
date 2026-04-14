import { prisma } from "@/lib/prisma"
import { createCategory } from "@/actions/financeiro/categories/create-category"
import { deleteCategory } from "@/actions/financeiro/categories/update-category"
import { TipoCategoria } from "@prisma/client"

async function main() {
    console.log("🧪 Testing Category Service...")

    // 1. Create Parent (Receita)
    const receita = await createCategory({
        nome: "Teste Receita",
        tipo: TipoCategoria.RECEITA,
        cor: "#00FF00"
    })
    console.log("✅ Created Parent:", receita.id)

    // 2. Create Subcategory (Receita) - Should Pass
    const subReceita = await createCategory({
        nome: "Teste Sub Receita",
        tipo: TipoCategoria.RECEITA,
        categoria_pai_id: receita.id
    })
    console.log("✅ Created Subcategory:", subReceita.id)

    // 3. Create Subcategory (Despesa) under Receita - Should Fail
    try {
        await createCategory({
            nome: "Teste Sub Errada",
            tipo: TipoCategoria.DESPESA,
            categoria_pai_id: receita.id
        })
        console.error("❌ Failed to block wrong type")
    } catch (e) {
        console.log("✅ Blocked wrong type:", (e as Error).message)
    }

    // 4. Create 3rd Level - Should Fail
    try {
        await createCategory({
            nome: "Teste 3o Nivel",
            tipo: TipoCategoria.RECEITA,
            categoria_pai_id: subReceita.id
        })
        console.error("❌ Failed to block 3rd level")
    } catch (e) {
        console.log("✅ Blocked 3rd level:", (e as Error).message)
    }

    // 5. Delete Parent with Children - Should Fail (Soft Delete Check)
    try {
        await deleteCategory(receita.id)
        console.error("❌ Failed to block delete with children")
    } catch (e) {
        console.log("✅ Blocked delete with children:", (e as Error).message)
    }

    // 6. Delete Child
    await deleteCategory(subReceita.id)
    console.log("✅ Deleted child")

    // 7. Delete Parent - Should Pass now
    await deleteCategory(receita.id)
    console.log("✅ Deleted parent")

    console.log("🎉 All Tests Passed!")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
