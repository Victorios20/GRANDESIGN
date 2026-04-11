import { prisma } from "@/lib/prisma"
import { updateOverdueStatus } from "@/actions/financeiro/automation/update-overdue"
import { createPayable } from "@/actions/financeiro/payables/create"
import { TipoCategoria, StatusFinanceiro } from "@prisma/client"
import { subDays, addDays } from "date-fns"

async function main() {
    console.log("🧪 Testing Overdue Automation (Phase 3.6)...")

    // Setup
    const suffix = Date.now()
    const cat = await prisma.categoria.create({ data: { nome: `Auto Test ${suffix}`, tipo: TipoCategoria.DESPESA, ativo: true } })

    const yesterday = subDays(new Date(), 1)
    const tomorrow = addDays(new Date(), 1)

    // 1. Create Test Data
    console.log("Creating bills...")
    const overdueBill = await createPayable({
        descricao: "Conta Atrasada",
        valor: 100,
        data_emissao: yesterday,
        data_vencimento: yesterday, // Expired
        categoria_id: cat.id
    })

    const futureBill = await createPayable({
        descricao: "Conta Futura",
        valor: 100,
        data_emissao: yesterday,
        data_vencimento: tomorrow, // Valid
        categoria_id: cat.id
    })

    // 2. Run Automation
    console.log("Running automation...")
    const result = await updateOverdueStatus()
    console.log("Result:", result)

    // 3. Verify
    const b1 = await prisma.contaPagar.findUnique({ where: { id: overdueBill.id } })
    const b2 = await prisma.contaPagar.findUnique({ where: { id: futureBill.id } })

    if (b1?.status !== StatusFinanceiro.ATRASADO) throw new Error(`Bill 1 should be ATRASADO, got ${b1?.status}`)
    if (b2?.status !== StatusFinanceiro.PENDENTE) throw new Error(`Bill 2 should be PENDENTE, got ${b2?.status}`)

    console.log("✅ Automation Verified")

    // Cleanup
    await prisma.contaPagar.deleteMany({ where: { categoria_id: cat.id } })
    await prisma.categoria.delete({ where: { id: cat.id } })
    await prisma.$disconnect()
}

main()
    .catch(console.error)
