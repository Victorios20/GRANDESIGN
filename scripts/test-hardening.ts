import { prisma } from "@/lib/prisma"
import { payBill } from "@/actions/financeiro/payables/pay"
import { createPayable } from "@/actions/financeiro/payables/create"
import { TipoCategoria, StatusFinanceiro, TipoContaBancaria } from "@prisma/client"

async function main() {
    console.log("🧪 Testing Hardening (Phase 3.7)...")

    const suffix = Date.now()
    const cat = await prisma.categoria.create({ data: { nome: `Hardening ${suffix}`, tipo: TipoCategoria.DESPESA, ativo: true } })
    const bank = await prisma.contasBancaria.create({ data: { nome: `Bank ${suffix}`, tipo: TipoContaBancaria.CORRENTE, saldo_inicial: 1000, saldo_atual: 1000, ativo: true } })

    try {
        // 1. Concurrency Test
        console.log("--- Concurrency Test (Double Pay) ---")
        const bill = await createPayable({
            descricao: "Concurrency Bill",
            valor: 100,
            data_emissao: new Date(),
            data_vencimento: new Date(),
            categoria_id: cat.id
        })

        // Try to pay full amount twice in parallel
        // NOTE: This simulates concurrent requests hitting the DB
        const input = {
            conta_pagar_id: bill.id,
            conta_bancaria_id: bank.id,
            valor: 100,
            data_pagamento: new Date(),
            juros: 0,
            descontos: 0
        }

        console.log("Launching 2 concurrent payment requests...")
        const p1 = payBill(input)
        const p2 = payBill(input)

        const results = await Promise.allSettled([p1, p2])
        const fulfilled = results.filter(r => r.status === 'fulfilled')
        const rejected = results.filter(r => r.status === 'rejected')

        console.log(`Success: ${fulfilled.length}, Rejected: ${rejected.length}`)

        if (rejected.length > 0) {
            console.log("Rejection Reason:", (rejected[0] as PromiseRejectedResult).reason.message)
        }

        if (fulfilled.length !== 1) throw new Error("Should only allow 1 successful payment")
        if (rejected.length !== 1) throw new Error("Should reject the second concurrent payment")

        // 2. Idempotency Test
        console.log("--- Idempotency Test ---")
        const bill2 = await createPayable({
            descricao: "Idempotency Bill",
            valor: 50,
            data_emissao: new Date(),
            data_vencimento: new Date(),
            categoria_id: cat.id
        })

        const key = `idem-${suffix}`
        const inputIdem = { ...input, conta_pagar_id: bill2.id, valor: 50, idempotencyKey: key }

        console.log("First Call (Should execute)...")
        const res1 = await payBill(inputIdem)

        console.log("Second Call (Should return cached result)...")
        const res2 = await payBill(inputIdem)

        // Check if result is same object structure
        if (JSON.stringify(res1) !== JSON.stringify(res2)) {
            throw new Error("Idempotency failed: Results do not match")
        }
        console.log("Idempotency Verified (Results Match)")


        console.log("✅ Hardening Verified")

    } catch (e: any) {
        console.error("❌ Test Failed:", e.message)
        process.exit(1)
    } finally {
        // Cleanup
        await prisma.contaPagar.deleteMany({ where: { categoria_id: cat.id } })
        await prisma.lancamento.deleteMany({ where: { conta_bancaria_id: bank.id } })
        await prisma.contasBancaria.delete({ where: { id: bank.id } })
        await prisma.categoria.delete({ where: { id: cat.id } })
        await prisma.idempotencyLog.deleteMany({ where: { key: { contains: String(suffix) } } })
        await prisma.$disconnect()
    }
}

main()
