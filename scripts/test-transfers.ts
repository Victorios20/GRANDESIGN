import { prisma } from "@/lib/prisma"
import { createTransfer } from "@/actions/financeiro/transfers/create-transfer"
import { TipoContaBancaria, TipoCategoria, TipoLancamento } from "@prisma/client"

async function main() {
    console.log("🧪 Testing Transfer Logic (Phase 3.3)...")

    // 1. Setup Data
    // Ensure System Categories Exist (Mocking Seed)
    const catSaida = await prisma.categoria.upsert({
        where: { id: 99990 }, // Arbitrary ID check/update not possible easily without unique constraint on name+type
        // We'll just create or find by name
        update: {},
        create: { nome: "Transferências (Saída)", tipo: TipoCategoria.DESPESA, system: true, ativo: true }
    }).catch(async () => {
        return await prisma.categoria.findFirst({ where: { nome: "Transferências (Saída)" } })
    })

    // Actually upsert by ID is tricky if we don't know it. 
    // Let's just ensure they exist using findFirst/create
    let cSaida = await prisma.categoria.findFirst({ where: { nome: "Transferências (Saída)" } })
    if (!cSaida) {
        cSaida = await prisma.categoria.create({ data: { nome: "Transferências (Saída)", tipo: TipoCategoria.DESPESA, system: true } })
    }

    let cEntrada = await prisma.categoria.findFirst({ where: { nome: "Transferências (Entrada)" } })
    if (!cEntrada) {
        cEntrada = await prisma.categoria.create({ data: { nome: "Transferências (Entrada)", tipo: TipoCategoria.RECEITA, system: true } })
    }

    // Create Banks
    const bankOrigem = await prisma.contasBancaria.create({
        data: { nome: "Bank Origin", tipo: TipoContaBancaria.CORRENTE, saldo_inicial: 1000, saldo_atual: 1000, ativo: true }
    })
    const bankDestino = await prisma.contasBancaria.create({
        data: { nome: "Bank Dest", tipo: TipoContaBancaria.CORRENTE, saldo_inicial: 0, saldo_atual: 0, ativo: true }
    })

    console.log(`🏦 Initial State: Origin=${bankOrigem.saldo_atual}, Dest=${bankDestino.saldo_atual}`)

    // 2. Execute Transfer (200.00)
    const transfer = await createTransfer({
        descricao: "Transfer Test",
        valor: 200,
        data_transferencia: new Date(),
        conta_origem_id: bankOrigem.id,
        conta_destino_id: bankDestino.id
    })

    console.log("✅ Transfer Executed")
    console.log(`   > ID: ${transfer.transferencia.id}`)
    console.log(`   > New Origin Balance: ${transfer.saldo_origem}`)
    console.log(`   > New Dest Balance: ${transfer.saldo_destino}`)

    // 3. Verify Balances
    if (Number(transfer.saldo_origem) !== 800) throw new Error("Origin Balance Wrong")
    if (Number(transfer.saldo_destino) !== 200) throw new Error("Dest Balance Wrong")

    // 4. Verify Transactions Created
    const lancamentos = await prisma.lancamento.findMany({
        where: { transferencia_id: transfer.transferencia.id }
    })

    if (lancamentos.length !== 2) throw new Error("Should have created 2 transactions")

    const lSaida = lancamentos.find(l => l.tipo === TipoLancamento.DESPESA)
    const lEntrada = lancamentos.find(l => l.tipo === TipoLancamento.RECEITA)

    if (!lSaida || lSaida.conta_bancaria_id !== bankOrigem.id) throw new Error("Outbound transaction mismatch")
    if (!lEntrada || lEntrada.conta_bancaria_id !== bankDestino.id) throw new Error("Inbound transaction mismatch")

    console.log("✅ Double-entry bookkeeping verified")

    // Cleanup
    await prisma.lancamento.deleteMany({ where: { transferencia_id: transfer.transferencia.id } })
    await prisma.transferencia.delete({ where: { id: transfer.transferencia.id } })
    await prisma.contasBancaria.delete({ where: { id: bankOrigem.id } })
    await prisma.contasBancaria.delete({ where: { id: bankDestino.id } })
    // Assuming strict foreign keys might require deleting transactions first (done)

    console.log("🧹 Cleanup done")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
