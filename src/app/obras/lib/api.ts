// src/app/obras/lib/api.ts
import {
  CreateObraPayload, CriarObraResult,
  UpdateObraPayload, UpdateObraResponse
} from "./types"

// Somente chamadas do CLIENT (URLs relativas)
async function parseJSON<T>(res: Response): Promise<T> {
  const text = await res.text()
  try { return JSON.parse(text) as T } catch { throw new Error("Resposta inválida do servidor") }
}
function raise(msg?: string, fallback = "Erro") { throw new Error(msg || fallback) }

export async function createObra(payload: CreateObraPayload): Promise<CriarObraResult> {
  const r = await fetch(`/api/obras`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJSON<any>(r)
  if (!r.ok) raise(typeof data?.message === "string" ? data.message : data?.error, "Falha ao criar obra")
  return data as CriarObraResult
}

export async function updateObra(id: string | number, payload: UpdateObraPayload): Promise<UpdateObraResponse> {
  const r = await fetch(`/api/obras/${id}/edit`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJSON<any>(r)
  if (!r.ok) raise(typeof data?.message === "string" ? data.message : data?.error, "Falha ao atualizar obra")
  return data as UpdateObraResponse
}
