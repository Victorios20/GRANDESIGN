import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createPayable, createPayableInstallments, createPayableSchema, createPayableInstallmentSchema } from "@/actions/financeiro/payables/create"
import { getPayables } from "@/actions/financeiro/payables/get"
import { StatusFinanceiro } from "@prisma/client"
import { ZodError } from "zod"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
    const status = searchParams.get("status") as StatusFinanceiro | undefined
    const fornecedor_id = searchParams.get("fornecedor_id") ? Number(searchParams.get("fornecedor_id")) : undefined
    const categoria_id = searchParams.get("categoria_id") ? Number(searchParams.get("categoria_id")) : undefined

    try {
        const result = await getPayables({ page, limit, startDate, endDate, status, fornecedor_id, categoria_id })
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const url = new URL(req.url)

        // Check if it's the installment endpoint
        // Next.js App Router uses folders. If this file is in `api/financeiro/payables/route.ts`,
        // the path is `/api/financeiro/payables`. 
        // To handle `/create` and `/create-installments`, user might want separate routes or params.
        // User requested: POST /payables/create and POST /payables/create-installments
        // This implies sub-routes. We should structure folders for that or use query param?
        // Let's implement sub-folders for cleaner API as requested.
        // But since I'm in `route.ts`, this is the root.

        // Changing strategy: This file will handle the root LIST. 
        // I need separate files for create and create-installments.
        return NextResponse.json({ error: "Use specific endpoints /create or /create-installments" }, { status: 404 })

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
