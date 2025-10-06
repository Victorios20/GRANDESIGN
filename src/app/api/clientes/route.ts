// src/app/api/clientes/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  criarClienteBasico,
} from "@/actions/clientes-db/clientes-db"
import { getClienteIdByNomeUnaccent } from "@/actions/clientes-db/clientes-db"

export const runtime = "nodejs"

function onlyDigits(s?: string | null) {
  const v = String(s ?? "").replace(/\D/g, "")
  return v ? v : null
}
function clean(s?: string | null) {
  return s ? String(s).trim() : ""
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({} as any))

    const nome = clean(body?.nome)
    if (!nome) {
      return NextResponse.json(
        { error: "Nome obrigatório", code: "VALIDACAO" },
        { status: 400 }
      )
    }

    // Campos opcionais
    const telefone = onlyDigits(body?.telefone)
    const bairro = clean(body?.bairro) || null
    const cpf = onlyDigits(body?.cpf)
    const cidade_id =
      typeof body?.cidade_id === "number"
        ? body.cidade_id
        : Number.isFinite(Number(body?.cidade_id))
        ? Number(body.cidade_id)
        : null

    // Cria cliente (db já trava duplicidade por índice parcial)
    const created = await criarClienteBasico({
      nome,
      telefone, // já é null quando vazio
      bairro,
      cidade_id,
      cpf,      // já é null quando vazio
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    // 409 vindo da action com id do existente
    if (e?.code === "NOME_DUPLICADO") {
      if (e?.clienteId) {
        return NextResponse.json(
          {
            error: "Cliente já existe. Associado ao existente.",
            code: "NOME_DUPLICADO",
            id: e.clienteId,
          },
          { status: 409 }
        )
      }
      // fallback: tenta obter o id pelo nome (sem acento/caixa)
      try {
        const bodyClone = await req.clone().json().catch(() => ({} as any))
        const nomeClone = clean(bodyClone?.nome)
        const existenteId = await getClienteIdByNomeUnaccent(nomeClone)
        return NextResponse.json(
          {
            error: "Cliente já existe.",
            code: "NOME_DUPLICADO",
            id: existenteId ?? null,
          },
          { status: 409 }
        )
      } catch {
        return NextResponse.json(
          { error: "Cliente já existe.", code: "NOME_DUPLICADO" },
          { status: 409 }
        )
      }
    }

    // Fallback para duplicidade direto do Prisma (se escapar da action)
    if (e?.code === "P2002") {
      try {
        const bodyClone = await req.clone().json().catch(() => ({} as any))
        const nomeClone = clean(bodyClone?.nome)
        const existenteId = await getClienteIdByNomeUnaccent(nomeClone)
        return NextResponse.json(
          { error: "Nome duplicado.", code: "NOME_DUPLICADO", id: existenteId ?? null },
          { status: 409 }
        )
      } catch {
        return NextResponse.json(
          { error: "Nome duplicado.", code: "NOME_DUPLICADO" },
          { status: 409 }
        )
      }
    }

    // Outros erros
    console.error("POST /api/clientes error:", e)
    return NextResponse.json(
      { error: "Falha ao cadastrar cliente", code: "ERRO_INTERNO" },
      { status: 500 }
    )
  }
}
