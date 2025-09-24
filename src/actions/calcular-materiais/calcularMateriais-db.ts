// src/actions/calcular-materiais/calcularMateriais-db.ts
export type MaterialRow = {
  id: number
  descricao: string
  tipo: string
  preco_unitario: number
  unidade_de_medida: string | null
  fornecedorId: number | null
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let msg = `Falha em ${url}`
    try {
      const j = await res.json()
      if (j?.error) msg = String(j.error)
    } catch {}
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export async function getMateriaisByDescricoes(descricoes: string[], fornecedorId: number): Promise<MaterialRow[]> {
  const body = JSON.stringify({ descricoes, fornecedorId })
  return fetchJSON<MaterialRow[]>("/api/materiais/ByDescricoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
}

export async function getMateriaisByIds(ids: number[], fornecedorId: number): Promise<MaterialRow[]> {
  const body = JSON.stringify({ ids, fornecedorId })
  return fetchJSON<MaterialRow[]>("/api/materiais/ByIds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
}
export type ReceitaFixaRow = {
  material_id: number
  quantidade: number
  componente: string | null
}

export type ReceitaFixa = {
  material_id: number
  quantidade: number
  componente?: string | null
}

export async function getReceitasFixas(tipoObra: string): Promise<ReceitaFixa[]> {
  try {
    if (!tipoObra) return []
    const qs = new URLSearchParams({ tipoObra })
    const res = await fetch(`/api/CalcularMateriais/ReceitasFixas?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data as ReceitaFixa[]
  } catch {
    return []
  }
}



