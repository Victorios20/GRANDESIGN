import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding Orcado vs Realizado Data...")

    // 1. Create Cliente
    const cliente = await prisma.cliente.create({
        data: {
            nome: "Cliente Modelo Teste",
            telefone: "11999999999",
        }
    })

    // 2. Create Obra
    const obra = await prisma.obras.create({
        data: {
            cliente_id: cliente.id,
            titulo: "Residencial Modelo - Orçado x Realizado",
            endereco_obra: "Rua Exemplo, 123",
            maps_url: "",
            tipo_obra: "Residencial",
            largura: 10,
            comprimento: 20,
            telha_escolhida: "Americana",
            valor_obra: 500000.00,
            valor_mao_de_obra: 150000.00,
            status: "EXECUCAO",
            // Payments
            pagamento_entrada: 100000.00,
            status_pagamento_entrada: "EFETUADO",
            pagamento_quitacao: 400000.00,
            status_pagamento_quitacao: "PENDENTE"
        }
    })

    console.log(`Created Obra ID: ${obra.id}`)

    // 3. Create Baseline Pedidos (Nao Previsto = false)

    // Madeira (Predicted: 25k)
    await prisma.pedido_compra.create({
        data: {
            obra_id: obra.id,
            categoria: "MADEIRA",
            status: "ENTREGUE", // Realized
            valor_orcado: 25000.00,
            valor_realizado: 25000.00, // Exactly as planned
            descricao: "Madeiramento Cobertura (Baseline)",
            nao_previsto: false,
            itens: {
                create: { descricao: "Vigas", quantidade: 10, preco_unitario: 2500, total: 25000 }
            }
        }
    })

    // Telha (Predicted: 18k, Realized: 20k -> Over budget)
    await prisma.pedido_compra.create({
        data: {
            obra_id: obra.id,
            categoria: "TELHA",
            status: "ENTREGUE",
            valor_orcado: 18000.00,
            valor_realizado: 20000.00,
            descricao: "Telhas Americanas (Baseline)",
            nao_previsto: false,
            itens: {
                create: { descricao: "Milheiro Telha", quantidade: 10, preco_unitario: 1800, total: 18000 }
            }
        }
    })

    // Materiais (Predicted: 50k, Realized: 10k -> Under budget/In progress)
    await prisma.pedido_compra.create({
        data: {
            obra_id: obra.id,
            categoria: "MATERIAIS",
            status: "APROVADO",
            valor_orcado: 50000.00,
            valor_realizado: 10000.00, // Only part realized
            descricao: "Cimento e Areia (Baseline)",
            nao_previsto: false,
            itens: {
                create: { descricao: "Insumos", quantidade: 1, preco_unitario: 50000, total: 50000 }
            }
        }
    })

    // 4. Create EXTRA Pedidos (Nao Previsto = true)

    // Madeira Extra (Broken beam replacement)
    await prisma.pedido_compra.create({
        data: {
            obra_id: obra.id,
            categoria: "MADEIRA",
            status: "ENTREGUE",
            valor_orcado: 2000.00,
            valor_realizado: 2200.00,
            descricao: "Reposição Vigas Quebradas",
            nao_previsto: true,
            motivo_extra: "Quebra durante transporte interno",
            itens: {
                create: { descricao: "Viga Extra", quantidade: 1, preco_unitario: 2000, total: 2000 }
            }
        }
    })

    // Andaime (Not predicted at all, so purely extra if we assume logic, but let's say it was predicted as 0)
    // Logic check: If there is NO baseline purchase for Andaimes, Baseline = 0.
    // Here we add an Extra Andaime.
    await prisma.pedido_compra.create({
        data: {
            obra_id: obra.id,
            categoria: "ANDAIMES",
            status: "APROVADO",
            valor_orcado: 1500.00,
            valor_realizado: 1500.00,
            descricao: "Aluguel Andaime Extra",
            nao_previsto: true,
            motivo_extra: "Necessidade não prevista para fachada",
            itens: {
                create: { descricao: "Locação", quantidade: 1, preco_unitario: 1500, total: 1500 }
            }
        }
    })

    console.log("Data seeded successfully!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
