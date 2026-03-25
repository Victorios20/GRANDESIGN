import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CategoryMapping, ReportCategoryKey } from "@/services/financial/category-mapping"
import { Prisma, StatusConferencia } from "@prisma/client"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const obraIdParam = searchParams.get("obraId")
        const categoryKey = searchParams.get("categoryKey") as ReportCategoryKey

        if (!obraIdParam || !categoryKey) {
            return NextResponse.json({ error: "Obra ID and Category Key are required" }, { status: 400 })
        }

        const obraId = Number(obraIdParam)

        // 1. Get Centro Custo IDs
        const centros = await prisma.centroCusto.findMany({
            where: { obra_id: obraId },
            select: { id: true },
        })

        if (centros.length === 0) {
            return NextResponse.json({ items: [], total: 0 })
        }

        const ccIds = centros.map(c => c.id)

        // 2. Find relevant Category IDs
        // Since mapping is "Contains string", we fetch all active categories and filter them to find matching IDs.
        const allCategories = await prisma.categoria.findMany({
            where: { tipo: "DESPESA" }, // Only expenses
            select: { id: true, nome: true }
        })

        const matchingCategoryIds = allCategories
            .filter(c => CategoryMapping.getKey(c.nome) === categoryKey)
            .map(c => c.id)

        if (matchingCategoryIds.length === 0 && categoryKey !== "OUTROS") {
            return NextResponse.json({ items: [], total: 0 })
        }

        // 3. Build Query
        // Logic for "OUTROS": Categories that do NOT match any other key. 
        // This is trickier. If key == OUTROS, we want IDs NOT in list of other keys.
        // For simplicity heavily requested: Just fetch transactions and filtering in JS if volume is low? 
        // NO, let's stick to the ID filter approach.

        const whereClause: Prisma.LancamentoWhereInput = {
            centro_custo_id: { in: ccIds },
            tipo: "DESPESA",
        }

        // Optional Date Filter
        // const start = searchParams.get("start")
        // const end = searchParams.get("end")
        // if (start && end) { ... }

        if (categoryKey !== "OUTROS") {
            whereClause.categoria_id = { in: matchingCategoryIds }
        } else {
            // If OUTROS, exclude all known categories? 
            // Or simply iterate all transactions and filter.
            // Given that we need correct totals, filtering on `categoria_id IN [...]` is safer if we trust the mapping.
            // But for OUTROS it's "NOT IN (ids of WOOD, TILE, etc)".
            // Let's optimize: Fetch transactions and filter using map logic is safer for consistency?
            // With limit 200, maybe okay.

            // Let's refine:
            // If "OUTROS", filter: categoria_id NOT IN (ids that map to specific keys)
            const specificKeys: ReportCategoryKey[] = ["MADEIRA", "TELHA", "ANDAIME", "MATERIAIS", "MAO_DE_OBRA"]
            const excludedIds = allCategories
                .filter(c => specificKeys.includes(CategoryMapping.getKey(c.nome)))
                .map(c => c.id)

            whereClause.categoria_id = { notIn: excludedIds }
        }

        // 4. Execute Query
        const transactions = await prisma.lancamento.findMany({
            where: whereClause,
            orderBy: { data_competencia: "desc" }, // Most recent first
            take: 200,
            include: {
                conta_bancaria: { select: { nome: true } },
                conta_pagar: { include: { fornecedor: { select: { nome: true } } } },
                categoria: { select: { nome: true } }
            }
        })

        // 5. Transform to Items
        const items = transactions.map(t => ({
            id: t.id,
            data: t.data_competencia, // Preferred per spec
            descricao: t.descricao,
            conta: t.conta_bancaria.nome,
            valor: Number(t.valor),
            fornecedor: t.conta_pagar?.fornecedor?.nome || "—",
            categoriaOriginal: t.categoria.nome,
            conciliado: t.status_conferencia === StatusConferencia.CONFERIDO
        }))

        return NextResponse.json({ items, total: items.length })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        console.error("Error fetching transactions:", error)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
