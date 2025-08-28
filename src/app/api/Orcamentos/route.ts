import { NextResponse } from "next/server"
import { buscarOrcamentosDB } from "@/actions/historico-orcamento-db/historico-orcamento-db"

export const dynamic = "force-dynamic" // evita cache

function parsePage(input: string | null): number | undefined {
  if (!input) return undefined
  const n = Number(input)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined
}

function parsePageSize(input: string | null): 5 | 10 | 20 | undefined {
  if (!input) return undefined
  const n = Number(input)
  return n === 5 || n === 10 || n === 20 ? (n as 5 | 10 | 20) : undefined
}

function parseOrder(input: string | null): "asc" | "desc" | undefined {
  if (!input) return undefined
  const v = input.toLowerCase()
  return v === "asc" || v === "desc" ? (v as "asc" | "desc") : undefined
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Mapeamento dos nomes de query -> params do DB
    const nome = searchParams.get("q") ?? undefined
    const bairro = searchParams.get("bairro") ?? undefined
    const dataIni = searchParams.get("ini") ?? undefined       // 'YYYY-MM-DD'
    const dataFim = searchParams.get("fim") ?? undefined        // 'YYYY-MM-DD'
    const page = parsePage(searchParams.get("page")) ?? 1
    const perPage = parsePageSize(searchParams.get("pageSize")) ?? 10
    const ordenarData = parseOrder(searchParams.get("ordem")) ?? "desc"

    // Valida formato básico de datas (se vierem)
    const ymd = /^\d{4}-\d{2}-\d{2}$/
    if ((dataIni && !ymd.test(dataIni)) || (dataFim && !ymd.test(dataFim))) {
      return NextResponse.json({ error: "Formato de data inválido (use YYYY-MM-DD)." }, { status: 400 })
    }

    const result = await buscarOrcamentosDB({
      nome,
      bairro,
      dataIni,
      dataFim,
      page,
      perPage,
      ordenarData,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error("Erro ao buscar orçamentos:", err)
    return NextResponse.json({ error: "Erro ao buscar orçamentos" }, { status: 500 })
  }
}
