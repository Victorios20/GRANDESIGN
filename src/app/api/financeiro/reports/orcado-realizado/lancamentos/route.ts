import { NextRequest, NextResponse } from "next/server"
import { Prisma, StatusConferencia } from "@prisma/client"

import { isExcludedFinancialCategory } from "@/lib/financial/fixed-category-taxonomy"
import { prisma } from "@/lib/prisma"
import { CategoryMapping, REPORT_CATEGORY_KEYS, type ReportCategoryKey } from "@/services/financial/category-mapping"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const obraIdParam = searchParams.get("obraId")
        const categoryKey = searchParams.get("categoryKey") as ReportCategoryKey | null

        if (!obraIdParam || !categoryKey) {
            return NextResponse.json({ error: "Obra ID and Category Key are required" }, { status: 400 })
        }

        if (!REPORT_CATEGORY_KEYS.includes(categoryKey)) {
            return NextResponse.json({ error: "Invalid Category Key" }, { status: 400 })
        }

        const obraId = Number(obraIdParam)
        if (!Number.isFinite(obraId)) {
            return NextResponse.json({ error: "Invalid Obra ID" }, { status: 400 })
        }

        const centros = await prisma.centroCusto.findMany({
            where: { obra_id: obraId },
            select: { id: true },
        })

        if (centros.length === 0) {
            return NextResponse.json({ items: [], total: 0 })
        }

        const ccIds = centros.map((centro) => centro.id)
        const allCategories = await prisma.categoria.findMany({
            where: { tipo: "DESPESA" },
            include: {
                categoria_pai: {
                    select: { nome: true },
                },
            },
        })

        const matchingCategoryIds = allCategories
            .filter((category) => !isExcludedFinancialCategory(category))
            .filter((category) => CategoryMapping.getKey(category.nome) === categoryKey)
            .map((category) => category.id)

        const whereClause: Prisma.LancamentoWhereInput = {
            centro_custo_id: { in: ccIds },
            tipo: "DESPESA",
        }

        if (categoryKey === "OUTROS") {
            const mappedIds = allCategories
                .filter((category) => isExcludedFinancialCategory(category) || CategoryMapping.getKey(category.nome) !== "OUTROS")
                .map((category) => category.id)

            whereClause.categoria_id = { notIn: mappedIds }
        } else {
            if (matchingCategoryIds.length === 0) {
                return NextResponse.json({ items: [], total: 0 })
            }

            whereClause.categoria_id = { in: matchingCategoryIds }
        }

        const transactions = await prisma.lancamento.findMany({
            where: whereClause,
            orderBy: { data_competencia: "desc" },
            take: 200,
            include: {
                conta_bancaria: { select: { nome: true } },
                conta_pagar: { include: { fornecedor: { select: { nome: true } } } },
                conta_receber: { include: { cliente: { select: { nome: true } } } },
                categoria: { select: { nome: true } },
            },
        })

        const items = transactions.map((transaction) => ({
            id: transaction.id,
            data: transaction.data_competencia,
            descricao: transaction.descricao,
            conta: transaction.conta_bancaria?.nome ?? "Não definida",
            valor: Number(transaction.valor),
            fornecedor: transaction.conta_pagar?.fornecedor?.nome || transaction.conta_receber?.cliente?.nome || "-",
            categoriaOriginal: transaction.categoria.nome,
            conciliado: transaction.status_conferencia === StatusConferencia.CONFERIDO,
            contaPagarId: transaction.conta_pagar_id,
            contaReceberId: transaction.conta_receber_id,
        }))

        return NextResponse.json({ items, total: items.length })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        console.error("Error fetching transactions:", error)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
