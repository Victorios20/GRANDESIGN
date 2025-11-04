// src/app/obras/lib/server-api.ts
import "server-only"
import { headers } from "next/headers"

import {
  type CreateObraPayload,
  type CriarObraResult,
  type GetOrcamentoResult,
  type ObraDetalheDTO,
  type UpdateObraPayload,
  type UpdateObraResponse,
} from "./types"

async function parseJSON<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error("Resposta inválida do servidor")
  }
}

function raise(msg?: string, fallback = "Erro") {
  throw new Error(msg || fallback)
}

/** Monta uma URL absoluta segura para SSR/Edge. */
async function absoluteURL(path: string): Promise<string> {
  // 1) se existir BASE_URL configurada, usa ela
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_URL ||
    process.env.VERCEL_URL

  if (base && /^https?:\/\//i.test(base)) {
    return new URL(path, base).toString()
  }
  if (base && !/^https?:\/\//i.test(base)) {
    // quando vem só host (ex: "localhost:3000" ou "meu-dominio.com")
    return new URL(path, `https://${base}`).toString()
  }

  // 2) fallback: usa os headers da request atual
  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000"
  const proto = h.get("x-forwarded-proto") || "http"
  return new URL(path, `${proto}://${host}`).toString()
}

/** View: obra detalhada (mantenha o caminho que você usa no view). */
export async function getObraDetalhada(id: string): Promise<ObraDetalheDTO> {
  const url = await absoluteURL(`/api/obras/${id}/detalhado`)
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) raise("", "Falha ao buscar obra")
  return parseJSON<ObraDetalheDTO>(r)
}

/** Create: precisa do orçamento para prefill. Rota confirmada: /api/Orcamentos/[id] */
export async function getInitByOrcamento(orcamentoId: string | number): Promise<GetOrcamentoResult> {
  const id = typeof orcamentoId === "number" ? orcamentoId : Number(orcamentoId)
  if (!Number.isFinite(id)) raise("id de orçamento inválido")
  const url = await absoluteURL(`/api/Orcamentos/${id}`)
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) raise("", "Falha ao buscar orçamento")
  return parseJSON<GetOrcamentoResult>(r)
}

/** POST /api/obras */
export async function createObra(payload: CreateObraPayload): Promise<CriarObraResult> {
  const url = await absoluteURL(`/api/obras`)
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  })
  const data = await parseJSON<any>(r)
  if (!r.ok) {
    const msg = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : ""
    raise(msg, "Falha ao criar obra")
  }
  return data as CriarObraResult
}

/** PUT /api/obras/[id]/edit (somente infos gerais, por enquanto) */
export async function updateObra(id: string | number, payload: UpdateObraPayload): Promise<UpdateObraResponse> {
  const obraId = typeof id === "number" ? id : Number(id)
  if (!Number.isFinite(obraId)) raise("id de obra inválido")
  const url = await absoluteURL(`/api/obras/${obraId}/edit`)
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  })
  const data = await parseJSON<any>(r)
  if (!r.ok) {
    const msg = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : ""
    raise(msg, "Falha ao atualizar obra")
  }
  return data as UpdateObraResponse
}
