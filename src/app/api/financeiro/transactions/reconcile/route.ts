import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { StatusConferencia } from "@prisma/client"

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const ids: number[] = body.ids

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 })
        }

        const result = await prisma.lancamento.updateMany({
            where: { id: { in: ids } },
            data: {
                status_conferencia: StatusConferencia.CONFERIDO,
                conferido_em: new Date(),
                conferido_por: Number(session.user.id),
                pendencia_motivo: null,
                version: { increment: 1 },
            },
        })

        return NextResponse.json({ updated: result.count })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
