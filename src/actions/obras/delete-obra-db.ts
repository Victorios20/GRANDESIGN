"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Prisma } from "@prisma/client"

export async function deleteObraDB(id: number) {
    try {
        const session = await getServerSession(authOptions)
        const roles = session?.user?.roles ?? []

        if (!roles.includes("ADMIN") && !roles.includes("DEV")) {
            return { success: false, error: "Permissão negada. Apenas administradores e desenvolvedores podem excluir obras." }
        }

        if (!id) throw new Error("ID da obra não informado")

        // Exclusão em cascata total: além do que o Prisma já cascateia
        // (pedido_compra, ordem_servico, obra_imagens, obra_agenda_segmento,
        // obra_documentos, obra_budget_snapshot), também removemos o centro de
        // custo e TODO o financeiro vinculado (contas a pagar/receber e
        // lançamentos), mesmo os já pagos. Esses têm FK onDelete: SetNull e,
        // por isso, ficariam órfãos se não fossem apagados explicitamente.
        await prisma.$transaction(async (tx) => {
            const centros = await tx.centroCusto.findMany({ where: { obra_id: id }, select: { id: true } })
            const centroIds = centros.map((c) => c.id)

            const pedidos = await tx.pedido_compra.findMany({ where: { obra_id: id }, select: { id: true } })
            const pedidoIds = pedidos.map((p) => p.id)

            // Contas a pagar vinculadas à obra (direto, por centro de custo ou por pedido de compra)
            const pagarOr: Prisma.ContaPagarWhereInput[] = [{ obra_id: id }]
            if (centroIds.length) pagarOr.push({ centro_custo_id: { in: centroIds } })
            if (pedidoIds.length) pagarOr.push({ pedido_compra_id: { in: pedidoIds } })
            const pagarRows = await tx.contaPagar.findMany({ where: { OR: pagarOr }, select: { id: true } })
            const pagarIds = pagarRows.map((r) => r.id)

            // Contas a receber vinculadas à obra (direto ou por centro de custo)
            const receberOr: Prisma.ContaReceberWhereInput[] = [{ obra_id: id }]
            if (centroIds.length) receberOr.push({ centro_custo_id: { in: centroIds } })
            const receberRows = await tx.contaReceber.findMany({ where: { OR: receberOr }, select: { id: true } })
            const receberIds = receberRows.map((r) => r.id)

            // Lançamentos ligados às contas ou aos centros de custo
            const lancOr: Prisma.LancamentoWhereInput[] = []
            if (pagarIds.length) lancOr.push({ conta_pagar_id: { in: pagarIds } })
            if (receberIds.length) lancOr.push({ conta_receber_id: { in: receberIds } })
            if (centroIds.length) lancOr.push({ centro_custo_id: { in: centroIds } })
            if (lancOr.length) {
                await tx.lancamento.deleteMany({ where: { OR: lancOr } })
            }

            if (pagarIds.length) await tx.contaPagar.deleteMany({ where: { id: { in: pagarIds } } })
            if (receberIds.length) await tx.contaReceber.deleteMany({ where: { id: { in: receberIds } } })
            if (centroIds.length) await tx.centroCusto.deleteMany({ where: { id: { in: centroIds } } })

            // O restante (pedidos, imagens, segmentos, documentos, OS, snapshot) cai por Cascade
            await tx.obras.delete({ where: { id } })
        }, { maxWait: 20000, timeout: 60000 })

        revalidatePath("/obras")
        revalidatePath(`/obras/${id}`)

        return { success: true }
    } catch (error: any) {
        console.error("Erro ao excluir obra:", error)
        return { success: false, error: error.message || "Erro ao excluir obra" }
    }
}
