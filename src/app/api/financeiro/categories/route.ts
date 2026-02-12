import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCategoriesTree, getCategoriesFlat } from "@/actions/financeiro/categories/read-categories"
import { createCategory } from "@/actions/financeiro/categories/create-category"
import { updateCategory, deleteCategory } from "@/actions/financeiro/categories/update-category"
import { ZodError } from "zod"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format") // 'tree' or 'flat'

    try {
        const data = format === "flat"
            ? await getCategoriesFlat()
            : await getCategoriesTree()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar categorias" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json()
        const category = await createCategory(body)
        return NextResponse.json(category, { status: 201 })
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
        const category = await updateCategory(body)
        return NextResponse.json(category)
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.errors }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const id = Number(searchParams.get("id"))

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

        await deleteCategory(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
