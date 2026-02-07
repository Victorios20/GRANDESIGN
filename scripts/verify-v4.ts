
import { prisma } from "../src/lib/prisma"

// Pure Prisma verification to avoid Next.js Request Context issues in CLI
async function main() {
    console.log("Starting Verification V4 (DB Layer)...")

    // 0. Create Client
    const cliente = await prisma.cliente.create({
        data: {
            nome: "Cliente Teste Verificação",
            telefone: "11999999999",
            cpf: "11122233344"
        }
    })
    console.log("1. Created client:", cliente.id)

    // 1. Create Obra with data_contrato
    // Simulates "create-obra-db" but raw
    const obra = await prisma.obras.create({
        data: {
            titulo: "Obra V4 DB Test",
            endereco_obra: "Rua Teste",
            maps_url: "",
            tipo_obra: "RESIDENCIAL",
            largura: 10,
            comprimento: 10,
            telha_escolhida: "TIPO A",
            valor_obra: 10000,
            valor_mao_de_obra: 5000,
            status: "A_INICIAR", // Using raw string matching enum
            cliente_id: cliente.id,
            data_contrato: new Date("2024-01-01"), // Testing field persistence
        }
    })
    console.log("2. Created obra:", obra.id, "with data_contrato:", obra.data_contrato)

    if (!obra.data_contrato) throw new Error("data_contrato failed to save")

    // 2. Add Agenda without Team (equipe_id: null)
    await prisma.obraAgendaSegmento.create({
        data: {
            obra_id: obra.id,
            inicio: new Date("2024-02-01"),
            fim: new Date("2024-02-05"),
            equipe_id: null, // Critical check
            tipo: "EXECUCAO",
            status: "AGENDADO",
            observacoes: "Teste sem equipe"
        }
    })
    console.log("3. Created agenda segment without equipe.")

    // Verify
    const segments = await prisma.obraAgendaSegmento.findMany({ where: { obra_id: obra.id } })
    if (segments.length !== 1) throw new Error("Agenda segment missing")
    if (segments[0].equipe_id !== null) throw new Error("Equipe ID is not null")

    // 3. Clear Agenda
    await prisma.obraAgendaSegmento.deleteMany({ where: { obra_id: obra.id } })
    const segments2 = await prisma.obraAgendaSegmento.findMany({ where: { obra_id: obra.id } })
    if (segments2.length !== 0) throw new Error("Agenda clear failed")
    console.log("4. Agenda cleared.")

    // 4. Update Status and set data_conclusao manually
    // This simulates the LOGIC we put in the server action, but verifies the DB accepts it
    await prisma.obras.update({
        where: { id: obra.id },
        data: {
            status: "FINALIZADO",
            data_conclusao: new Date("2024-03-01")
        }
    })

    const updatedObra = await prisma.obras.findUnique({ where: { id: obra.id } })
    console.log("5. Updated status to FINALIZADO. data_conclusao:", updatedObra?.data_conclusao)

    if (updatedObra?.status !== "FINALIZADO") throw new Error("Status update failed")
    if (!updatedObra?.data_conclusao) throw new Error("data_conclusao update failed")

    // Cleanup
    await prisma.obras.delete({ where: { id: obra.id } })
    await prisma.cliente.delete({ where: { id: cliente.id } })
    console.log("6. Cleanup complete.")

    console.log("SUCCESS! DB Layer Verification Passed.")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
