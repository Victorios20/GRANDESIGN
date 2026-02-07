
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    try {
        const { id } = await params
        const cidadeId = Number(id)
        if (!cidadeId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

        const body = await req.json()
        const { nome, cor } = body

        const cidade = await prisma.cidades.update({
            where: { id: cidadeId },
            data: {
                nome: nome || undefined,
                cor: cor // allow null to clear color
            }
        })

        return NextResponse.json(cidade)
    } catch (err) {
        console.error("Erro ao atualizar cidade:", err)
        return NextResponse.json({ error: "Erro ao atualizar cidade" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    try {
        const { id } = await params
        const cidadeId = Number(id)
        if (!cidadeId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

        await prisma.cidades.delete({
            where: { id: cidadeId }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error("Erro ao excluir cidade:", err)
        // Check for foreign key constraint usually
        return NextResponse.json({ error: "Erro ao excluir cidade. Verifique se há clientes vinculados." }, { status: 500 })
    }
}
