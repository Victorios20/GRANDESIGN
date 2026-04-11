import { prisma } from "@/lib/prisma"
import { createPayableInstallments } from "@/actions/financeiro/payables/create"
import { TipoCategoria } from "@prisma/client"
import * as fs from "fs"

async function main() {
    console.log("🧪 Debugging Payables Logic...")

    const suffix = Date.now()
    const catDespesa = await prisma.categoria.create({
        data: { nome: `Debug Desp ${suffix}`, tipo: TipoCategoria.DESPESA, ativo: true }
    })

    try {
        const startDate = new Date()

        console.log("Creating Payable Installments...")
        await createPayableInstallments({
            descricao: "Debug Installments",
            valor_total: 100,
            total_parcelas: 3,
            data_emissao: startDate,
            primeiro_vencimento: startDate,
            categoria_id: catDespesa.id
        })
        console.log("✅ Success")
        fs.writeFileSync("debug_result.txt", "SUCCESS")

    } catch (e: any) {
        console.error("❌ ERROR CAUGHT")
        const errorMsg = `Error: ${e.message}\nStack: ${e.stack}\nFull: ${JSON.stringify(e, null, 2)}`
        fs.writeFileSync("debug_error.log", errorMsg)
    } finally {
        await prisma.contaPagar.deleteMany({ where: { categoria_id: catDespesa.id } })
        await prisma.categoria.delete({ where: { id: catDespesa.id } })
        await prisma.$disconnect()
    }
}

main()
