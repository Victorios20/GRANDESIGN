import { PrismaClient, TipoLancamento, StatusFinanceiro, TipoContaBancaria, TipoCategoria } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding Financial Data (Lancamentos) for Report...")

    // 1. Find the Obra (ID 2 assumed from previous seed, or find by title)
    let obra = await prisma.obras.findFirst({
        where: { titulo: "Residencial Modelo - Orçado x Realizado" }
    })

    if (!obra) {
        // Fallback if ID 2 exists but title changed
        obra = await prisma.obras.findUnique({ where: { id: 2 } })
    }

    if (!obra) {
        console.error("❌ Obra not found. Run 'npx tsx prisma/seed-orcado.ts' first.")
        process.exit(1)
    }

    console.log(`Phase 1: Found Obra ID: ${obra.id}`)

    // 2. Ensure Categories Exist
    const catsToCreate = [
        { nome: "Madeira", tipo: TipoCategoria.DESPESA },
        { nome: "Telha", tipo: TipoCategoria.DESPESA },
        { nome: "Andaime Locação", tipo: TipoCategoria.DESPESA },
        { nome: "Materiais Construção", tipo: TipoCategoria.DESPESA },
        { nome: "Mão de Obra (Pedreiro)", tipo: TipoCategoria.DESPESA },
    ]

    const categoriesMap: Record<string, number> = {}

    for (const c of catsToCreate) {
        let cat = await prisma.categoria.findFirst({ where: { nome: c.nome } })
        if (!cat) {
            cat = await prisma.categoria.create({ data: { nome: c.nome, tipo: c.tipo, cor: "#000000" } })
        }
        categoriesMap[c.nome] = cat.id
    }

    // 3. Ensure Centro Custo exists for Obra
    let cc = await prisma.centroCusto.findFirst({ where: { obra_id: obra.id } })
    if (!cc) {
        cc = await prisma.centroCusto.create({
            data: {
                nome: `CC - ${obra.titulo}`,
                obra_id: obra.id,
                descricao: "Centro de Custo Principal da Obra"
            }
        })
        console.log(`Created Centro Custo: ${cc.id}`)
    } else {
        console.log(`Found Centro Custo: ${cc.id}`)
    }

    // 4. Ensure Bank Account (Conta Bancaria)
    let bank = await prisma.contasBancaria.findFirst()
    if (!bank) {
        bank = await prisma.contasBancaria.create({
            data: {
                nome: "Banco Principal",
                tipo: TipoContaBancaria.CORRENTE,
                saldo_inicial: 100000,
                saldo_atual: 100000
            }
        })
    }

    // 5. Create Suppliers (Fornecedores)
    const suppliers = ["Madeireira Silva", "Telhas & Cia", "Locadora Andaimes", "Deposito Construtor", "Empreiteira Modelo"]
    const supplierIds: number[] = []

    for (const name of suppliers) {
        let sup = await prisma.fornecedores.findFirst({ where: { nome: name } })
        if (!sup) {
            sup = await prisma.fornecedores.create({
                data: { nome: name, tipo: "PARCEIRO" }
            })
        }
        supplierIds.push(sup.id)
    }

    // 6. Create Lancamentos (Expenses)
    const today = new Date()

    const transactions = [
        { cat: "Madeira", val: 12000, desc: "Compra Madeira 1", forn: 0, dt: new Date(today.getTime() - 86400000 * 10) },
        { cat: "Madeira", val: 13000, desc: "Compra Madeira 2", forn: 0, dt: new Date(today.getTime() - 86400000 * 5) },
        { cat: "Madeira", val: 2200, desc: "Madeira Extra (Reposição)", forn: 0, dt: new Date() }, // Matches Extra

        { cat: "Telha", val: 10000, desc: "Telhas Lote 1", forn: 1, dt: new Date(today.getTime() - 86400000 * 15) },
        { cat: "Telha", val: 10000, desc: "Telhas Lote 2", forn: 1, dt: new Date(today.getTime() - 86400000 * 2) },

        { cat: "Materiais Construção", val: 5000, desc: "Cimento", forn: 3, dt: new Date(today.getTime() - 86400000 * 8) },
        { cat: "Materiais Construção", val: 5000, desc: "Areia e Brita", forn: 3, dt: new Date(today.getTime() - 86400000 * 7) },

        { cat: "Andaime Locação", val: 1500, desc: "Aluguel Andaime - Mês 1", forn: 2, dt: new Date(today.getTime() - 86400000 * 20) },

        { cat: "Mão de Obra (Pedreiro)", val: 25000, desc: "Pagamento Quinzena 1", forn: 4, dt: new Date(today.getTime() - 86400000 * 14) },
        { cat: "Mão de Obra (Pedreiro)", val: 25000, desc: "Pagamento Quinzena 2", forn: 4, dt: new Date() },
    ]

    let count = 0
    for (const t of transactions) {
        const catId = categoriesMap[t.cat]
        const supId = supplierIds[t.forn]

        try {
            // Create CP first to debug
            const cp = await prisma.contaPagar.create({
                data: {
                    fornecedor_id: supId,
                    valor_total: t.val,
                    valor_pago: t.val,
                    data_vencimento: t.dt,
                    data_emissao: t.dt,
                    data_pagamento: t.dt,
                    status: StatusFinanceiro.PAGO,
                    descricao: t.desc,
                    centro_custo_id: cc.id,
                    categoria_id: catId
                }
            })

            await prisma.lancamento.create({
                data: {
                    tipo: TipoLancamento.DESPESA,
                    valor: t.val,
                    descricao: t.desc,
                    data_competencia: t.dt,
                    data_lancamento: t.dt,
                    conciliado: true,
                    categoria_id: catId,
                    centro_custo_id: cc.id,
                    conta_bancaria_id: bank.id,
                    conta_pagar_id: cp.id // Connect manually
                }
            })
            count++
        } catch (err: any) {
            console.error("❌ Error creating index " + count + ":", err.message)
            throw err
        }
    }

    console.log(`✅ Successfully created ${count} Lancamentos for Obra ID ${obra.id}`)
}

main()
    .catch((e) => {
        console.error(e)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
