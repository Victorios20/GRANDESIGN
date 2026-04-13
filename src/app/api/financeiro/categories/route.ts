import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCategoriesTree, getCategoriesFlat } from "@/actions/financeiro/categories/read-categories"
import { createCategory } from "@/actions/financeiro/categories/create-category"
import { updateCategory, deleteCategory } from "@/actions/financeiro/categories/update-category"
import { ZodError } from "zod"

function getSessionRoles(session: unknown) {
    const roles = (session as { user?: { roles?: unknown[] } } | null)?.user?.roles ?? []
    return Array.isArray(roles) ? roles : []
}

function hasCategoryManagementAccess(session: unknown) {
    return getSessionRoles(session).some((role) => {
        const value = String(role).toUpperCase()
        return value === "ADMIN" || value === "DEV"
    })
}

type CategoryRecord = {
    id: number
    nome: string
    tipo: string
    cor: string | null
    icone: string | null
    ativo: boolean
    categoria_pai_id: number | null
    categoria_pai?: {
        id: number
        nome: string
    } | null
    subcategorias?: CategoryRecord[]
    _count?: {
        subcategorias?: number
        lancamentos?: number
        contas_pagar?: number
        contas_receber?: number
    }
}

type SerializedCategory = {
    id: number
    nome: string
    tipo: string
    cor: string | null
    icone: string | null
    ativo: boolean
    categoria_pai_id: number | null
    categoriaPai: {
        id: number
        nome: string
    } | null
    lancamentosCount: number
    contasPagarCount: number
    contasReceberCount: number
    usageCount: number
    subcategoriasCount: number
    subcategorias: SerializedCategory[]
}

function serializeCategory(category: CategoryRecord): SerializedCategory {
    const lancamentosCount = category._count?.lancamentos ?? 0
    const contasPagarCount = category._count?.contas_pagar ?? 0
    const contasReceberCount = category._count?.contas_receber ?? 0

    return {
        id: category.id,
        nome: category.nome,
        tipo: category.tipo,
        cor: category.cor,
        icone: category.icone,
        ativo: category.ativo,
        categoria_pai_id: category.categoria_pai_id,
        categoriaPai: category.categoria_pai ?? null,
        lancamentosCount,
        contasPagarCount,
        contasReceberCount,
        usageCount: lancamentosCount + contasPagarCount + contasReceberCount,
        subcategoriasCount: category._count?.subcategorias ?? category.subcategorias?.length ?? 0,
        subcategorias: category.subcategorias?.map(serializeCategory) ?? [],
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format")
    const activeOnly = searchParams.get("active") !== "false"

    try {
        const data = format === "flat"
            ? await getCategoriesFlat(activeOnly)
            : await getCategoriesTree(activeOnly)

        return NextResponse.json(data.map(serializeCategory))
    } catch {
        return NextResponse.json({ error: "Erro ao buscar categorias" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasCategoryManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const category = await createCategory(body)
        return NextResponse.json(serializeCategory(category), { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasCategoryManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await req.json()

        const category = await updateCategory(body)
        return NextResponse.json(serializeCategory(category))
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 })
        }
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasCategoryManagementAccess(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const id = Number(searchParams.get("id"))

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

        const category = await deleteCategory(id)
        return NextResponse.json({ success: true, category: serializeCategory(category) })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
}
