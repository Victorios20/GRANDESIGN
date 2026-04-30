import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { OrcadoRealizadoClient } from "./_components/OrcadoRealizadoClient"

export const dynamic = "force-dynamic"

const INITIAL_OBRAS_LIMIT = 15

export const metadata: Metadata = {
    title: "Orçado vs Realizado | GRANDESIGN",
    description: "Relatório de acompanhamento financeiro: Orçado vs Realizado",
}

export default async function OrcadoRealizadoPage() {
    const obras = await prisma.obras.findMany({
        select: {
            id: true,
            titulo: true,
            cliente: {
                select: { nome: true }
            }
        },
        orderBy: [
            { data_ultima_alteracao: "desc" },
            { id: "desc" },
        ],
        take: INITIAL_OBRAS_LIMIT,
    })

    const obrasFormatted = obras.map(obra => ({
        id: obra.id,
        titulo: obra.titulo || `Obra #${obra.id} - ${obra.cliente?.nome || "Sem cliente"}`
    }))

    return <OrcadoRealizadoClient obras={obrasFormatted} />
}
