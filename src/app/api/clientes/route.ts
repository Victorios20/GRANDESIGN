// src/app/api/clientes/route.ts
import { NextResponse } from "next/server"
import {
  criarClienteBasico,
  buscarClientesPorNome,
} from "@/actions/clientes-db/clientes-db"

export const runtime = "nodejs"

function onlyDigits(s?: string | null) {
  return s ? String(s).replace(/\D/g, "") : null
}
function clean(s?: string | null) {
  return s ? String(s).trim() : ""
}

export async function POST(req: Request) {
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
    const cpf = onlyDigits(body?.cpf) // hoje não vem da tela, mas deixamos suportado
    const cidade_id =
      typeof body?.cidade_id === "number"
        ? body.cidade_id
        : Number.isFinite(Number(body?.cidade_id))
        ? Number(body.cidade_id)
        : null

    // Cria cliente (DB já tem trava de nome "a partir de agora")
    const created = await criarClienteBasico({
      nome,
      telefone: telefone ?? null,
      bairro,
      cidade_id,
      cpf: cpf ?? null,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    // Se o DB sinalizar duplicidade de nome, tentamos retornar também o id do existente
    if (e?.code === "NOME_DUPLICADO") {
      try {
        const lista = await buscarClientesPorNome(e?.nome ?? e?.message ?? "", 10)
        const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")
        const alvo = norm(e?.nome ?? e?.message ?? "")
        const existente =
          lista?.find((c: any) => norm(c?.nome ?? "") === alvo) ?? lista?.[0]
        if (existente?.id) {
          return NextResponse.json(
            {
              error: "Cliente já existe. Associado ao existente.",
              code: "NOME_DUPLICADO",
              id: existente.id,
            },
            { status: 409 }
          )
        }
      } catch {
        /* ignore lookup fallback */
      }
      return NextResponse.json(
        { error: "Cliente já existe.", code: "NOME_DUPLICADO" },
        { status: 409 }
      )
    }

    // Outros erros conhecidos opcionais
    if (e?.code === "ERRO_VALIDACAO") {
      return NextResponse.json(
        { error: e?.message ?? "Falha de validação", code: "ERRO_VALIDACAO" },
        { status: 400 }
      )
    }

    console.error("POST /api/clientes error:", e)
    return NextResponse.json(
      { error: "Falha ao cadastrar cliente" },
      { status: 500 }
    )
  }
}
