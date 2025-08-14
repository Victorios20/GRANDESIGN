// Funções de validação — retornam { ok: boolean, reason?: ToastReason }
import type { ToastReason } from "./toast-catalog"

export type Material = {
  id: number
  nome: string
  componente?: string | null
  quantidade: number
  preco: number
  tamanho?: string | number
  frete?: number
}

export function guardEtapa1(dados: { nome: string; telefone: string; cidade?: string | null }) {
  const missing: string[] = []
  if (!dados.nome?.trim()) missing.push("nome")
  if (!dados.telefone?.trim()) missing.push("telefone")
  if (!dados.cidade?.trim()) {
    return { ok: false, reason: "missing_city_or_tipoObra" as const }
  }
  if (missing.length) {
    return { ok: false, reason: "missing_client_fields" as const, fields: missing }
  }
  return { ok: true as const }
}

export function guardMateriais(mats: { madeiras: Material[]; materiaisGerais: Material[]; telhas: Material[] }) {
  const total = (mats.madeiras?.length ?? 0) + (mats.materiaisGerais?.length ?? 0) + (mats.telhas?.length ?? 0)
  if (total === 0 || (mats.madeiras?.length ?? 0) === 0) {
    return { ok: false, reason: "materials_required" as const }
  }
  const pendencias: string[] = []
  mats.madeiras?.forEach((m, i) => {
    if (!m.nome?.trim()) pendencias.push(`madeira[#${i + 1}].nome`)
    if (!m.componente?.trim()) pendencias.push(`madeira[#${i + 1}].componente`)
  })
  if (pendencias.length) {
    return { ok: false, reason: "materials_required" as const, fields: pendencias }
  }
  return { ok: true as const }
}

export function guardNonNegative(campos: Array<{ label: string; value: number }>) {
  const invalid = campos.filter((c) => Number(c.value) < 0).map((c) => c.label)
  if (invalid.length) return { ok: false, reason: "non_negative_violation" as const, fields: invalid }
  return { ok: true as const }
}

export function guardTitulo(titulo: string) {
  if (!titulo?.trim()) return { ok: false, reason: "missing_title" as const }
  return { ok: true as const }
}

export function guardStep4(params: {
  form: { nome: string; telefone: string; cidade?: string | null }
  tipoObra: string | null
  materiais: { madeiras: Material[]; materiaisGerais: Material[]; telhas: Material[] }
  titulo?: string
}) {
  if (!params.tipoObra?.trim()) return { ok: false, reason: "missing_city_or_tipoObra" as const }
  const g1 = guardEtapa1(params.form)
  if (!g1.ok) return g1
  const g2 = guardMateriais(params.materiais)
  if (!g2.ok) return g2
  if (params.titulo !== undefined) {
    const g3 = guardTitulo(params.titulo)
    if (!g3.ok) return g3
  }
  return { ok: true as const }
}
