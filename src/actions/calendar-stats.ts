"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function getLastAgendaUpdate() {
    try {
        const session = await getServerSession(authOptions as any)
        if (!session) return null

        const lastSegment = await prisma.obraAgendaSegmento.findFirst({
            orderBy: {
                updated_at: "desc",
            },
            select: {
                updated_at: true,
            },
        })

        return lastSegment?.updated_at || null
    } catch (error) {
        console.error("Error fetching last agenda update:", error)
        return null
    }
}
