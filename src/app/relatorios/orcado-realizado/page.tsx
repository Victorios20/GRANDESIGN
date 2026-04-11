import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { OrcadoRealizadoClient } from "./_components/OrcadoRealizadoClient"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
    title: "Orçado vs Realizado | GRANDESIGN",
    description: "Relatório de acompanhamento financeiro: Orçado vs Realizado",
}

export default async function OrcadoRealizadoPage() {
    const obras = await prisma.obras.findMany({
        where: {
            status: { notIn: ["FINALIZADO"] }
        },
        select: {
            id: true,
            titulo: true,
            // We can fetch more info if needed for the selector, like client name
            cliente: {
                select: { nome: true }
            }
        },
        orderBy: {
            data_criacao: "desc"
        }
    })

    // Transform to simpler shape for client if necessary, or pass as is (compatible with ObraOption if we map)
    const obrasFormatted = obras.map(obra => ({
        id: obra.id,
        titulo: obra.titulo || `Obra #${obra.id} - ${obra.cliente?.nome || "Sem cliente"}`
    }))

    return <OrcadoRealizadoClient obras={obrasFormatted} />
}
