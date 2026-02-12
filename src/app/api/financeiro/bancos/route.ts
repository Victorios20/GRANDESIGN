import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBanks, createBank } from "@/actions/financeiro/banks/read-create-bank"
import { updateBank } from "@/actions/financeiro/banks/update-bank"
import { ZodError } from "zod"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const activeOnly = searchParams.get("active") !== "false"
        const banks = await getBanks(activeOnly)
        return NextResponse.json(banks)
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar bancos" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const bank = await createBank(body)
        return NextResponse.json(bank, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.errors }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const bank = await updateBank(body)
        return NextResponse.json(bank)
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.errors }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
