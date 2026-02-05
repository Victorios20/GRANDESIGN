import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { atualizarFornecedor, removerFornecedor } from "@/actions/fornecedores-db/fornecedores-db"

export const runtime = "nodejs"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const fornecedorId = Number(id)
    if (!Number.isFinite(fornecedorId) || fornecedorId <= 0) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({} as any))
    const nome = typeof body?.nome === "string" ? body.nome.trim() : undefined
    const tipo = typeof body?.tipo === "string" ? body.tipo.trim().toLowerCase() : undefined

    if (!nome) {
        return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })
    }

    try {
        const atualizado = await atualizarFornecedor(fornecedorId, nome, tipo)
        return NextResponse.json(atualizado, { status: 200 })
    } catch (e: any) {
        const msg = e?.message || "Falha ao atualizar fornecedor"
        return NextResponse.json({ error: msg }, { status: 400 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const fornecedorId = Number(id)
    if (!Number.isFinite(fornecedorId) || fornecedorId <= 0) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    try {
        await removerFornecedor(fornecedorId)
        return NextResponse.json({ ok: true, id: fornecedorId }, { status: 200 })
    } catch (e: any) {
        const msg = e?.message || "Falha ao excluir fornecedor"
        return NextResponse.json({ error: msg }, { status: 400 })
    }
}
