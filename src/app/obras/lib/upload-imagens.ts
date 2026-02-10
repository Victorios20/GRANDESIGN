// src/app/obras/lib/upload-imagens.ts

export type UploadImagemItem = {
  key: string
  url: string
  originalName: string
  contentType: string
  size: number
}

export type UploadImagensResult = {
  urls: string[]
  files: UploadImagemItem[]
}

export async function uploadImagensObra(
  files: File[],
  opts?: { signal?: AbortSignal }
): Promise<UploadImagensResult> {
  const safe = Array.isArray(files) ? files.filter((f) => f instanceof File) : []
  if (safe.length === 0) return { urls: [], files: [] }

  const fd = new FormData()
  for (const f of safe) fd.append("files", f)

  const res = await fetch("/api/uploads/imagens", {
    method: "POST",
    body: fd,
    signal: opts?.signal,
  })

  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const err: any = new Error(data?.message || data?.error || "Falha no upload de imagens.")
    err.status = res.status
    err.code = data?.error || "UPLOAD_FAILED"
    err.detail = data?.detail
    throw err
  }

  if (!data?.ok || !Array.isArray(data?.urls)) {
    const err: any = new Error(data?.message || "Resposta inválida do servidor no upload.")
    err.status = res.status
    err.code = data?.error || "UPLOAD_INVALID_RESPONSE"
    err.detail = data
    throw err
  }

  return {
    urls: data.urls as string[],
    files: (Array.isArray(data.files) ? data.files : []) as UploadImagemItem[],
  }
}
