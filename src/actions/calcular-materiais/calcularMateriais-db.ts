// src/actions/CalcularMateriais/calcularMateriais-db.ts

export type MaterialRow = {
  id: number
  descricao: string
  tipo: string
  preco_unitario: number
  unidade: string
}

type ReceitaFixa = { material_id: number; quantidade: number }

const jsonHeaders = { "Content-Type": "application/json", Accept: "application/json" }

/** Mantém a mesma assinatura esperada pelo calcularMateriais.ts */
export async function getReceitasFixas(tipoObra: string): Promise<ReceitaFixa[]> {
  try {
    const url = `/api/CalcularMateriais/ReceitasFixas?tipoObra=${encodeURIComponent(tipoObra)}`
    const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } })
    if (!res.ok) return []
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return []
    return data as ReceitaFixa[]
  } catch {
    return []
  }
}

/** Mantém a mesma assinatura esperada pelo calcularMateriais.ts */
export async function getMateriaisByIds(ids: number[]): Promise<MaterialRow[]> {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return []
    const res = await fetch("/api/materiais/ByIds", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return []
    return data as MaterialRow[]
  } catch {
    return []
  }
}

/** Mantém a mesma assinatura esperada pelo calcularMateriais.ts */
export async function getMateriaisByDescricoes(descricoes: string[]): Promise<MaterialRow[]> {
  try {
    if (!Array.isArray(descricoes) || descricoes.length === 0) return []
    const res = await fetch("/api/materiais/ByDescricoes", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ descricoes }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return []
    return data as MaterialRow[]
  } catch {
    return []
  }
}
