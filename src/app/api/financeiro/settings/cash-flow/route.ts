import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { ZodError } from "zod"

import { authOptions } from "@/lib/auth"
import {
    getCashFlowSettings,
    updateCashFlowSettings,
} from "@/actions/financeiro/settings/cash-flow"

function getSessionRoles(session: unknown) {
    const roles = (session as { user?: { roles?: unknown[] } } | null)?.user?.roles ?? []
    return Array.isArray(roles) ? roles : []
}

function hasSettingsManagementAccess(session: unknown) {
    return getSessionRoles(session).some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        return NextResponse.json(await getCashFlowSettings())
    } catch {
        return NextResponse.json({ error: "Erro ao buscar parametrizacoes do fluxo de caixa" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasSettingsManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await req.json()
        return NextResponse.json(await updateCashFlowSettings(body, Number(session.user.id)))
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }

        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
