import {
  CreateObraPayload, CriarObraResult,
  UpdateObraPayload, UpdateObraResponse
} from "./types"

type ApiErrorBody = {
  error?: string
  code?: string
  message?: string
  details?: unknown
}

type ParsedBody<T> = {
  data: T | null
  text: string
  isJson: boolean
}

async function parseBody<T>(res: Response): Promise<ParsedBody<T>> {
  const text = await res.text()
  if (!text.trim()) return { data: null, text, isJson: false }

  try {
    return { data: JSON.parse(text) as T, text, isJson: true }
  } catch {
    return { data: null, text, isJson: false }
  }
}

function raiseApiError(
  body: ApiErrorBody | null,
  fallbackMessage: string,
  fallbackCode = "UNKNOWN",
  rawText?: string,
  status?: number
): never {
  const message =
    (typeof body?.message === "string" && body.message.trim()) ||
    (typeof body?.error === "string" && body.error.trim()) ||
    (rawText?.trim() || "") ||
    fallbackMessage

  const err = new Error(message) as Error & {
    code?: string
    status?: number
    title?: string
    description?: string
  }

  err.code = body?.code || body?.error || fallbackCode
  err.status = status
  err.title = message
  err.description = rawText?.trim() || undefined

  throw err
}

export async function createObra(payload: CreateObraPayload): Promise<CriarObraResult> {
  const r = await fetch(`/api/obras`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const { data, text, isJson } = await parseBody<any>(r)
  if (!r.ok) {
    raiseApiError(isJson ? data : null, "Falha ao criar obra", "UNKNOWN", text, r.status)
  }
  if (!isJson || !data) {
    raiseApiError(null, "Resposta inválida do servidor", "INVALID_RESPONSE", text, r.status)
  }

  return data.data as CriarObraResult
}

export async function updateObra(id: string | number, payload: UpdateObraPayload): Promise<UpdateObraResponse> {
  const r = await fetch(`/api/obras/${id}/edit`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const { data, text, isJson } = await parseBody<any>(r)
  if (!r.ok) {
    raiseApiError(isJson ? data : null, "Falha ao atualizar obra", "UNKNOWN", text, r.status)
  }
  if (!isJson || !data) {
    raiseApiError(null, "Resposta inválida do servidor", "INVALID_RESPONSE", text, r.status)
  }

  return data as UpdateObraResponse
}
