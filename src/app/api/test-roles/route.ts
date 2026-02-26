import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const roles = await prisma.userRole.findMany({
        include: { role: true, user: true }
    })

    const formatted = roles.map(r => ({
        userId: r.user.id,
        email: r.user.email,
        name: r.user.name,
        role: r.role.name
    }))

    return NextResponse.json(formatted)
}
