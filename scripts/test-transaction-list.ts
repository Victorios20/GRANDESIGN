import { prisma } from "@/lib/prisma"
import { createTransaction } from "@/actions/financeiro/transactions/create-transaction"
import { getTransactions } from "@/actions/financeiro/transactions/get-transactions"
import { TipoLancamento, TipoContaBancaria, TipoCategoria } from "@prisma/client"
import { subDays, addDays } from "date-fns"

async function main() {
    console.log("🧪 Testing Transaction Listing (Phase 3.2)...")

    // Setup
    const bank = await prisma.contasBancaria.create({
        data: { nome: "List Test Bank", tipo: TipoContaBancaria.CORRENTE, saldo_inicial: 0, saldo_atual: 0, ativo: true }
    })
    const catRec = await prisma.categoria.create({ data: { nome: "List Rec", tipo: TipoCategoria.RECEITA } })
    const catDesp = await prisma.categoria.create({ data: { nome: "List Desp", tipo: TipoCategoria.DESPESA } })

    // Seed Data: 5 Transactions
    // 3 Receitas (Today, Yesterday, 2 days ago)
    // 2 Despesas (Today, Yesterday)
    const today = new Date()

    await createTransaction({ descricao: "Rec 1", valor: 100, tipo: TipoLancamento.RECEITA, data_lancamento: today, conta_bancaria_id: bank.id, categoria_id: catRec.id })
    await createTransaction({ descricao: "Rec 2", valor: 100, tipo: TipoLancamento.RECEITA, data_lancamento: subDays(today, 1), conta_bancaria_id: bank.id, categoria_id: catRec.id })
    await createTransaction({ descricao: "Rec 3", valor: 100, tipo: TipoLancamento.RECEITA, data_lancamento: subDays(today, 2), conta_bancaria_id: bank.id, categoria_id: catRec.id })

    await createTransaction({ descricao: "Desp 1", valor: 50, tipo: TipoLancamento.DESPESA, data_lancamento: today, conta_bancaria_id: bank.id, categoria_id: catDesp.id })
    await createTransaction({ descricao: "Desp 2", valor: 50, tipo: TipoLancamento.DESPESA, data_lancamento: subDays(today, 1), conta_bancaria_id: bank.id, categoria_id: catDesp.id })

    console.log("✅ Seeded 5 transactions")

    // Test 1: List All (Pagination)
    const listAll = await getTransactions({ limit: 2, conta_bancaria_id: bank.id })
    console.log(`✅ Page 1 (Limit 2): Got ${listAll.data.length} items. Total: ${listAll.meta.total}`)
    if (listAll.data.length !== 2 || listAll.meta.total !== 5) throw new Error("Pagination failed")

    // Test 2: Filter by Type (Receita)
    const listRec = await getTransactions({ conta_bancaria_id: bank.id, tipo: TipoLancamento.RECEITA })
    console.log(`✅ Filter Type (Receita): Got ${listRec.data.length}`)
    if (listRec.data.length !== 3) throw new Error("Filter Type failed")

    // Test 3: Filter by Date (Today)
    // Need precise start/end of day logic usually, but here we can just check if it includes
    // Let's filter for just TODAY (Rec 1 and Desp 1)
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    const listToday = await getTransactions({
        conta_bancaria_id: bank.id,
        startDate: startOfDay,
        endDate: endOfDay
    })
    console.log(`✅ Filter Date (Today): Got ${listToday.data.length}`)
    if (listToday.data.length !== 2) throw new Error("Filter Date failed")

    // Test 4: Include checks
    const firstItem = listRec.data[0]
    if (!firstItem.categoria || !firstItem.conta_bancaria) throw new Error("Includes missing")
    console.log(`✅ Includes verified: Category=${firstItem.categoria.nome}, Bank=${firstItem.conta_bancaria.nome}`)

    // Cleanup
    await prisma.lancamento.deleteMany({ where: { conta_bancaria_id: bank.id } })
    await prisma.contasBancaria.delete({ where: { id: bank.id } })
    console.log("🧹 Cleanup done")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
