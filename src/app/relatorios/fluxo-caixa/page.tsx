import { prisma } from "@/lib/prisma"
import FluxoCaixaClient from "./_components/FluxoCaixaClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function FluxoCaixaPage() {
    const [costCenters, bankAccounts] = await Promise.all([
        prisma.centroCusto.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' }
        }),
        prisma.contasBancaria.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' }
        })
    ])

    return <FluxoCaixaClient costCenters={costCenters} bankAccounts={bankAccounts} />
}
