import { prisma } from "@/lib/prisma"
import { createPayable } from "@/actions/financeiro/payables/create"
import { payBill } from "@/actions/financeiro/payables/pay"
import { createReceivable } from "@/actions/financeiro/receivables/service"
import { receiveBill } from "@/actions/financeiro/receivables/receive"
import { TipoCategoria, StatusFinanceiro, TipoContaBancaria } from "@prisma/client"

async function main() {
    console.log("🧪 Testing Pay/Receive Actions (Phase 3.5)...")

    // Setup Categories & Bank
    const suffix = Date.now()
    const catDespesa = await prisma.categoria.create({ data: { nome: `Despesa Action ${suffix}`, tipo: TipoCategoria.DESPESA, ativo: true } })
    const catReceita = await prisma.categoria.create({ data: { nome: `Receita Action ${suffix}`, tipo: TipoCategoria.RECEITA, ativo: true } })

    const bank = await prisma.contasBancaria.create({
        data: { nome: `Bank Action ${suffix}`, tipo: TipoContaBancaria.CORRENTE, saldo_inicial: 1000, saldo_atual: 1000, ativo: true }
    })

    try {
        // 1. Test Pay Bill (Partial -> Full)
        console.log("--- Pay Bill Test ---")
        const bill = await createPayable({
            descricao: "Conta de Luz",
            valor: 100,
            data_emissao: new Date(),
            data_vencimento: new Date(),
            categoria_id: catDespesa.id
        })

        // Pay 40
        console.log("Paying 40...")
        const p1 = await payBill({
            conta_pagar_id: bill.id,
            conta_bancaria_id: bank.id,
            valor: 40,
            data_pagamento: new Date(),
            juros: 0,
            descontos: 0,
            quitarSaldo: false
        })

        if (p1.status !== StatusFinanceiro.PARCIAL) throw new Error("Status should be PARCIAL")
        if (Number(p1.valor_pago) !== 40) throw new Error("Paid amount mismatch")

        // Pay 60 (Full)
        console.log("Paying 60...")
        const p2 = await payBill({
            conta_pagar_id: bill.id,
            conta_bancaria_id: bank.id,
            valor: 60,
            data_pagamento: new Date(),
            juros: 0,
            descontos: 0,
            quitarSaldo: false
        })

        if (p2.status !== StatusFinanceiro.PAGO) throw new Error("Status should be PAGO")
        if (Number(p2.valor_pago) !== 100) throw new Error("Paid amount mismatch")

        // Check Bank
        const bankAfterPay = await prisma.contasBancaria.findUnique({ where: { id: bank.id } })
        console.log(`Bank Balance: ${bankAfterPay?.saldo_atual} (Expected 900)`)
        if (Number(bankAfterPay?.saldo_atual) !== 900) throw new Error("Bank balance incorrect after payment")


        // 2. Test Receive Bill (Full)
        console.log("--- Receive Bill Test ---")
        const invoice = await createReceivable({
            descricao: "Venda Website",
            valor: 500,
            data_emissao: new Date(),
            data_vencimento: new Date(),
            categoria_id: catReceita.id
        })

        // Receive 500
        console.log("Receiving 500...")
        const r1 = await receiveBill({
            conta_receber_id: invoice.id,
            conta_bancaria_id: bank.id,
            valor: 500,
            data_recebimento: new Date(),
            juros: 0,
            descontos: 0
        })

        if (r1.status !== StatusFinanceiro.PAGO) throw new Error("Status should be PAGO")
        if (Number(r1.valor_recebido) !== 500) throw new Error("Received amount mismatch")

        // Check Bank
        const bankAfterRec = await prisma.contasBancaria.findUnique({ where: { id: bank.id } })
        console.log(`Bank Balance: ${bankAfterRec?.saldo_atual} (Expected 1400)`)
        if (Number(bankAfterRec?.saldo_atual) !== 1400) throw new Error("Bank balance incorrect after receipt")

        console.log("✅ All Actions Verified")

    } catch (e: any) {
        console.error("❌ ERROR:", e)
        process.exit(1)
    } finally {
        // Cleanup
        await prisma.contaPagar.deleteMany({ where: { categoria_id: catDespesa.id } })
        await prisma.contaReceber.deleteMany({ where: { categoria_id: catReceita.id } })
        await prisma.lancamento.deleteMany({ where: { conta_bancaria_id: bank.id } })
        await prisma.contasBancaria.delete({ where: { id: bank.id } })
        await prisma.categoria.delete({ where: { id: catDespesa.id } })
        await prisma.categoria.delete({ where: { id: catReceita.id } })
        await prisma.$disconnect()
    }
}

main()
