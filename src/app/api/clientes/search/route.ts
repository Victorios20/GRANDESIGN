import { NextResponse } from "next/server"
import { buscarClientesPorNome, buscarClientesPorTelefone } from "@/actions/clientes-db/clientes-db"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const rawQ = searchParams.get("q") ?? ""
    const q = rawQ.trim()

    const byParam = (searchParams.get("by") ?? "name").toLowerCase()
    const by = byParam === "phone" ? "phone" : "name"

    const limitParam = Number(searchParams.get("limit"))
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : 10

    if (!q) {
      return NextResponse.json([], { status: 200 })
    }

    const data =
      by === "phone"
        ? await buscarClientesPorTelefone(q, limit)
        : await buscarClientesPorNome(q, limit)

    const payload = (data ?? []).map((c: any) => ({
      id: c.id,
      nome: c.nome ?? "",
      telefone: c.telefone ?? null,
      bairro: c.bairro ?? null,
      cidade_id: c.cidade_id ?? null,
      cidade_nome: c.cidade_nome ?? null,
      cpf: c.cpf ?? null,
    }))

    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    console.error("GET /api/clientes/search error:", err)
    return NextResponse.json({ error: "Falha na busca de clientes" }, { status: 500 })
  }
}
