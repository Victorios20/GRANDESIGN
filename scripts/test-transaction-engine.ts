import { prisma } from "@/lib/prisma"
import { createTransaction } from "@/actions/financeiro/transactions/create-transaction"
import { TipoLancamento, TipoContaBancaria, TipoCategoria } from "@prisma/client"

async function main() {
    console.log("🧪 Testing Transaction Engine (Phase 3.1)...")

    // Setup: Create Bank & Categories
    const bank = await prisma.contasBancaria.create({
        data: {
            nome: "Bank Engine Test 2",
            tipo: TipoContaBancaria.CORRENTE,
            saldo_inicial: 2000,
            saldo_atual: 2000,
            ativo: true
        }
    })

    const catRec = await prisma.categoria.create({ data: { nome: "Rec Engine 2", tipo: TipoCategoria.RECEITA } })
    const catDesp = await prisma.categoria.create({ data: { nome: "Desp Engine 2", tipo: TipoCategoria.DESPESA } })

    console.log(`🏦 Initial Balance: ${bank.saldo_atual}`)

    // 1. Test RECEITA (+500)
    const res1 = await createTransaction({
        descricao: "Venda Teste 1",
        valor: 500,
        tipo: TipoLancamento.RECEITA,
        data_lancamento: new Date(),
        // data_competencia omitted to test default
        conta_bancaria_id: bank.id,
        categoria_id: catRec.id
    })

    console.log(`✅ Transaction 1 (Receita): New Balance Returned: ${res1.novo_saldo}`)

    if (Number(res1.novo_saldo) !== 2500) throw new Error("Balance mismatch in return value")

    // Verify DB
    const bankAfterT1 = await prisma.contasBancaria.findUnique({ where: { id: bank.id } })
    if (Number(bankAfterT1?.saldo_atual) !== 2500) throw new Error("Balance mismatch in DB")

    // Verify Date Default
    if (res1.lancamento.data_competencia.toISOString() !== res1.lancamento.data_lancamento.toISOString()) {
        throw new Error("Date default failed")
    }
    console.log("✅ Date default verified")


    // 2. Test DESPESA (-200)
    const res2 = await createTransaction({
        descricao: "Compra Teste 1",
        valor: 200,
        tipo: TipoLancamento.DESPESA,
        data_lancamento: new Date(),
        conta_bancaria_id: bank.id,
        categoria_id: catDesp.id
    })

    console.log(`✅ Transaction 2 (Despesa): New Balance Returned: ${res2.novo_saldo}`)
    if (Number(res2.novo_saldo) !== 2300) throw new Error("Balance mismatch after Despesa")

    // 3. Test Validation Failure (Type Mismatch)
    try {
        await createTransaction({
            descricao: "Fail Test Logic",
            valor: 1000,
            tipo: TipoLancamento.RECEITA, // Wrong type for Despesa Category
            data_lancamento: new Date(),
            conta_bancaria_id: bank.id,
            categoria_id: catDesp.id
        })
        console.error("❌ Failed to catch logic error")
    } catch (e) {
        console.log("✅ Expected logic failure caught")
    }

    // Verify Balance Unchanged
    const bankAfterFail = await prisma.contasBancaria.findUnique({ where: { id: bank.id } })
    if (Number(bankAfterFail?.saldo_atual) !== 2300) {
        throw new Error("Rollback failed! Balance changed after error.")
    }
    console.log("✅ Balance remained unchanged after failure")

    // Cleanup
    await prisma.lancamento.deleteMany({ where: { conta_bancaria_id: bank.id } })
    await prisma.contasBancaria.delete({ where: { id: bank.id } })
    console.log("🧹 Cleanup done")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
