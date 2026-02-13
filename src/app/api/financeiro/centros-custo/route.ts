import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const centros = await prisma.centroCusto.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: "asc" },
        })
        return NextResponse.json(centros)
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar centros de custo" }, { status: 500 })
    }
}
