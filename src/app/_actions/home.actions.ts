// app/_actions/home.actions.ts
// Helpers client-safe para a Home: fazem fetch nas API Routes.
// Mantêm os mesmos tipos e assinaturas que a página já usa.

export interface OrcamentoTabela {
  id: number
  titulo: string | null
  cliente: string | null
  bairro: string | null
  dataISO: string
  valorFormatado: string
}

export type MaterialItem = {
  nome: string
  tipo: "madeira" | "geral" | "telha"
  quantidade?: number | null
  precoUnit?: number | null
  componente?: string | null
  tamanho?: number | null
  frete?: number | null
  total?: number | null
}

export type OrcamentoDetalhe = {
  id: number
  titulo: string | null
  dataISO: string
  tipoObra: string | null
  dimensoes: { largura: number; comprimento: number }
  cliente: {
    nome: string | null
    telefone: string | null
    bairro: string | null
    cidade: string | null
  }
  totais: {
    madeiras: number
    materiais: number
    comissao: number
    empresaPS: number
    empresaGD: number
    frete: number
    totalGeral: number
  }
  valorTotal: number
  materiais: MaterialItem[]
  pagamentos: { tipoTelhas: string; metodo: string; valor: number }[]
  link_slide?: string | null
  link_pdf?: string | null
}

const noStore: RequestInit = { cache: "no-store" }

export async function listarBairros(opts?: { signal?: AbortSignal }): Promise<string[]> {
  const r = await fetch(`/api/bairros`, { ...noStore, signal: opts?.signal })
  if (!r.ok) throw new Error("Falha ao listar bairros")
  return r.json()
}

export async function buscarOrcamentos(
  nome: string,
  bairro: string,
  dIniISO: string | undefined,
  dFimISO: string | undefined,
  page: number,
  perPage: number,
  ordenarData: "asc" | "desc"
): Promise<{ dados: OrcamentoTabela[]; total: number }> {
  const sp = new URLSearchParams()
  if (nome?.trim()) sp.set("q", nome)
  if (bairro?.trim()) sp.set("bairro", bairro)
  if (dIniISO) sp.set("ini", dIniISO)
  if (dFimISO) sp.set("fim", dFimISO)
  sp.set("page", String(page))
  sp.set("pageSize", String(perPage))
  sp.set("ordem", ordenarData)

  const r = await fetch(`/api/Orcamentos?${sp.toString()}`, noStore)
  if (!r.ok) throw new Error("Falha ao buscar orçamentos")
  return r.json()
}

export async function detalheOrcamento(id: number, opts?: { signal?: AbortSignal }): Promise<OrcamentoDetalhe | null> {
  const r = await fetch(`/api/Orcamentos/${id}`, { ...noStore, signal: opts?.signal })
  if (r.status === 404) return null
  if (!r.ok) throw new Error("Falha ao buscar detalhe do orçamento")
  return r.json()
}
