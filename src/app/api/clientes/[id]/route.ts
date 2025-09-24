// src/app/api/clientes/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

function onlyDigits(s?: string | null) {
  return s ? String(s).replace(/\D/g, "") : null
}
function clean(s?: string | null) {
  return s ? String(s).trim() : ""
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idNum = Number(params?.id)
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json(
        { error: "ID inválido", code: "VALIDACAO" },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({} as any))

    // Atualiza só os campos enviados
    const data: Record<string, any> = {}

    if (typeof body?.nome === "string") {
      const nome = clean(body.nome)
      if (!nome) {
        return NextResponse.json(
          { error: "Nome não pode ser vazio", code: "VALIDACAO" },
          { status: 400 }
        )
      }
      data.nome = nome
    }

    if (typeof body?.telefone === "string") {
      data.telefone = onlyDigits(body.telefone)
    }

    if (typeof body?.bairro === "string") {
      const b = clean(body.bairro)
      data.bairro = b || null
    }

    if (typeof body?.cidade_id !== "undefined") {
      const cid = body.cidade_id === null ? null : Number(body.cidade_id)
      if (cid !== null && !Number.isFinite(cid)) {
        return NextResponse.json(
          { error: "cidade_id inválido", code: "VALIDACAO" },
          { status: 400 }
        )
      }
      data.cidade_id = cid
    }

    if (typeof body?.cpf === "string") {
      data.cpf = onlyDigits(body.cpf)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nada para atualizar", code: "VALIDACAO" },
        { status: 400 }
      )
    }

    const updated = await prisma.cliente.update({
      where: { id: idNum },
      data,
      select: {
        id: true,
        nome: true,
        telefone: true,
        bairro: true,
        cidade_id: true,
        cpf: true,
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (e: any) {
    // Prisma v6: checar codes diretamente
    const code = e?.code as string | undefined

    // Registro não encontrado
    if (code === "P2025") {
      return NextResponse.json(
        { error: "Cliente não encontrado", code: "CLIENT_NOT_FOUND" },
        { status: 404 }
      )
    }

    // Violação de unicidade (nosso índice parcial de nome "a partir de agora")
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Já existe cliente com este nome", code: "NOME_DUPLICADO" },
        { status: 409 }
      )
    }

    console.error("PUT /api/clientes/[id] error:", e)
    return NextResponse.json(
      { error: "Falha ao atualizar cliente" },
      { status: 500 }
    )
  }
}
