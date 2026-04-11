import { prisma } from "@/lib/prisma"
import { validateTransaction, transactionSchema } from "@/lib/validators/financial"
import { TipoLancamento, TipoCategoria, TipoContaBancaria } from "@prisma/client"
import { subYears, addYears } from "date-fns"

async function main() {
    console.log("🧪 Testing Financial Validator...")

    // Setup: Create active and inactive entities
    const bankActive = await prisma.contasBancaria.create({ data: { nome: "Bank Active", tipo: TipoContaBancaria.CORRENTE, ativo: true } })
    const bankInactive = await prisma.contasBancaria.create({ data: { nome: "Bank Inactive", tipo: TipoContaBancaria.CORRENTE, ativo: false } }) // Force inactive creation? Schema defaults true.
    // Update to inactive manually
    await prisma.contasBancaria.update({ where: { id: bankInactive.id }, data: { ativo: false } })

    const catReceita = await prisma.categoria.create({ data: { nome: "Cat Rec", tipo: TipoCategoria.RECEITA } })
    const catDespesa = await prisma.categoria.create({ data: { nome: "Cat Desp", tipo: TipoCategoria.DESPESA } })

    // Valid Input
    const validInput = {
        descricao: "Valid Transaction",
        valor: 100.00,
        tipo: TipoLancamento.RECEITA,
        data_lancamento: new Date(),
        data_competencia: new Date(),
        conta_bancaria_id: bankActive.id,
        categoria_id: catReceita.id
    }

    // Test 1: Success
    try {
        transactionSchema.parse(validInput)
        await validateTransaction(validInput)
        console.log("✅ Valid transaction passed")
    } catch (e) {
        console.error("❌ Valid transaction failed:", e)
    }

    // Test 2: Inactive Bank
    try {
        await validateTransaction({ ...validInput, conta_bancaria_id: bankInactive.id })
        console.error("❌ Failed to catch inactive bank")
    } catch (e) {
        console.log("✅ Caught inactive bank")
    }

    // Test 3: Type Mismatch (Receita with Despesa Category)
    try {
        await validateTransaction({ ...validInput, tipo: TipoLancamento.RECEITA, categoria_id: catDespesa.id })
        console.error("❌ Failed to catch type mismatch")
    } catch (e) {
        console.log("✅ Caught type mismatch")
    }

    // Test 4: Date Limits (11 years ago)
    try {
        await validateTransaction({ ...validInput, data_lancamento: subYears(new Date(), 11) })
        console.error("❌ Failed to catch old date")
    } catch (e) {
        console.log("✅ Caught old date")
    }

    // Test 5: Invalid Value (Schema check)
    try {
        transactionSchema.parse({ ...validInput, valor: -10 })
        console.error("❌ Failed to catch negative value")
    } catch (e) {
        console.log("✅ Caught negative value")
    }

    // Cleanup
    // (Optional, or leave for debug)
    console.log("🎉 Validator Tests Completed")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
