import { prisma } from "@/lib/prisma"
import { createPayableInstallments } from "@/actions/financeiro/payables/create"
import { createReceivableInstallments } from "@/actions/financeiro/receivables/service"
import { TipoCategoria, StatusFinanceiro } from "@prisma/client"
import { addMonths } from "date-fns"

async function main() {
    console.log("🧪 Testing Payables/Receivables Logic (Phase 3.4 Debug)...")

    // Setup Categories
    // Ensure they don't exist or use unique names
    const suffix = Date.now()

    const catDespesa = await prisma.categoria.create({
        data: { nome: `Despesa Teste ${suffix}`, tipo: TipoCategoria.DESPESA, ativo: true }
    })
    const catReceita = await prisma.categoria.create({
        data: { nome: `Receita Teste ${suffix}`, tipo: TipoCategoria.RECEITA, ativo: true }
    })

    try {
        // 1. Test Installment Math (100 / 3)
        const startDate = new Date()

        console.log("Creating Payable Installments...")
        const payables = await createPayableInstallments({
            descricao: "Compra Parcelada Teste",
            valor_total: 100,
            total_parcelas: 3,
            data_emissao: startDate,
            primeiro_vencimento: startDate,
            categoria_id: catDespesa.id
        })

        console.log(`✅ Created ${payables.length} installments for Payable`)

        // 2. Test Receivable Logic
        console.log("Creating Receivable Installments...")
        const receivables = await createReceivableInstallments({
            descricao: "Venda Parcelada Teste",
            valor_total: 50,
            total_parcelas: 2,
            data_emissao: startDate,
            primeiro_vencimento: addMonths(startDate, 1),
            categoria_id: catReceita.id
        })

        console.log(`✅ Created ${receivables.length} installments for Receivable`)

    } catch (e: any) {
        console.error("❌ ERROR CAUGHT:")
        console.error(e)
        // Prisma usually puts useful info in e.message
    } finally {
        // Cleanup
        await prisma.contaPagar.deleteMany({ where: { categoria_id: catDespesa.id } })
        await prisma.contaReceber.deleteMany({ where: { categoria_id: catReceita.id } })
        await prisma.categoria.delete({ where: { id: catDespesa.id } })
        await prisma.categoria.delete({ where: { id: catReceita.id } })
        await prisma.$disconnect()
    }
}

main()
