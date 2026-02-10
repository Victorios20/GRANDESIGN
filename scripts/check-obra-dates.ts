
import { prisma } from "@/lib/prisma"

async function main() {
    const obraId = 7
    const obra = await prisma.obras.findUnique({
        where: { id: obraId },
        select: {
            id: true,
            titulo: true,
            data_inicio_obra: true,
            data_fim_obra: true,
            data_ultima_alteracao: true
        }
    })

    console.log("=== CHECK OBRA DATES ===")
    if (!obra) {
        console.log("Obra não encontrada")
    } else {
        console.log(`ID: ${obra.id}`)
        console.log(`Titulo: ${obra.titulo}`)
        console.log(`Data Início: ${obra.data_inicio_obra}`)
        console.log(`Data Fim: ${obra.data_fim_obra}`)
        console.log(`Updated At: ${obra.data_ultima_alteracao}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
