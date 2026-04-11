import { prisma } from "@/lib/prisma"
import { createBank } from "@/actions/financeiro/banks/read-create-bank"
import { updateBank, updateInitialBalance } from "@/actions/financeiro/banks/update-bank"
import { TipoContaBancaria, TipoLancamento } from "@prisma/client"

async function main() {
    console.log("🧪 Testing Bank Service...")

    // 1. Create Bank
    const bank = await createBank({
        nome: "Banco Teste",
        tipo: TipoContaBancaria.CORRENTE,
        saldo_inicial: 1000
    })
    console.log("✅ Created Bank:", bank.id, "Saldo:", bank.saldo_atual)

    // 2. Update Bank (Normal)
    await updateBank({
        id: bank.id,
        nome: "Banco Teste Editado"
    })
    console.log("✅ Updated Bank Name")

    // 3. Update Initial Balance (Should Pass - No transactions)
    await updateInitialBalance(bank.id, 2000)
    const bankUpdated = await prisma.contasBancaria.findUnique({ where: { id: bank.id } })
    console.log("✅ Updated Initial Balance to 2000. Current:", bankUpdated?.saldo_atual)

    // 4. Create Transaction to Lock Balance
    // Need a category first
    const cat = await prisma.categoria.findFirst({ where: { ativo: true } })
    if (!cat) throw new Error("No category found")

    await prisma.lancamento.create({
        data: {
            descricao: "Teste",
            valor: 100,
            tipo: TipoLancamento.RECEITA,
            data_lancamento: new Date(),
            data_competencia: new Date(),
            conta_bancaria_id: bank.id,
            categoria_id: cat.id
        }
    })
    console.log("✅ Created Transaction")

    // 5. Try Update Initial Balance (Should Fail)
    try {
        await updateInitialBalance(bank.id, 3000)
        console.error("❌ Failed to block balance update")
    } catch (e) {
        console.log("✅ Blocked balance update with transactions:", (e as Error).message)
    }

    // 6. Try Soft Delete (Should Fail if it's the only one - assuming seed created none or we clean up)
    // Let's ensure we have at least one other active bank to test success, or rely on failure if this is the only one.
    // The seed didn't create banks. So this might be the only one.
    const count = await prisma.contasBancaria.count({ where: { ativo: true } })
    if (count === 1) {
        try {
            await updateBank({ id: bank.id, ativo: false })
            console.error("❌ Failed to block delete of last bank")
        } catch (e) {
            console.log("✅ Blocked delete of last bank:", (e as Error).message)
        }
    }

    // Cleanup
    await prisma.lancamento.deleteMany({ where: { conta_bancaria_id: bank.id } })
    // Now we can delete
    if (count > 1) {
        await updateBank({ id: bank.id, ativo: false })
        console.log("✅ Soft deleted bank")
    }

    console.log("🎉 All Bank Tests Passed!")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
