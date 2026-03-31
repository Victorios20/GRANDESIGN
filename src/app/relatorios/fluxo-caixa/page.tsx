import { prisma } from "@/lib/prisma"
import { getCashFlowProjection } from "@/actions/financeiro/reports/get-cash-flow"
import FluxoCaixaClient from "./_components/FluxoCaixaClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function FluxoCaixaPage() {
    const [costCenters, initialData] = await Promise.all([
        prisma.centroCusto.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' }
        }),
        getCashFlowProjection({
            scope_mode: "preset_30",
        })
    ])

    return <FluxoCaixaClient costCenters={costCenters} initialData={initialData} />
}
