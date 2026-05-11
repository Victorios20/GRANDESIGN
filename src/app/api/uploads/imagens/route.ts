// src/app/api/uploads/imagens/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getS3Client } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

function json(body: unknown, status = 200, requestId?: string) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (requestId) headers.set("X-Request-Id", requestId)
  return new NextResponse(JSON.stringify(body), { status, headers })
}

function publicUrlForKey(key: string) {
  const endpoint = process.env.S3_ENDPOINT
  const bucket = process.env.S3_BUCKET
  if (!endpoint || !bucket) throw new Error("S3_ENDPOINT ou S3_BUCKET ausente.")
  return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`
}

function extFromMime(mime: string) {
  const m = (mime || "").toLowerCase().trim()
  if (m === "image/jpeg" || m === "image/jpg") return "jpg"
  if (m === "image/png") return "png"
  if (m === "image/webp") return "webp"
  if (m === "image/heic") return "heic"
  if (m === "image/heif") return "heif"
  return null
}

export async function POST(req: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  try {
    const bucket = process.env.S3_BUCKET
    if (!bucket) return json({ ok: false, error: "S3_BUCKET_MISSING", requestId }, 500, requestId)

    const form = await req.formData()

    const single = form.get("file")
    const multi = form.getAll("files")

    const raw = (single ? [single] : []).concat(multi).filter(Boolean)

    const files = raw.filter((x): x is File => x instanceof File)

    if (files.length === 0) {
      return json({ ok: false, error: "NO_FILES", message: "Envie 'file' ou 'files' via multipart/form-data.", requestId }, 400, requestId)
    }

    const maxFiles = 20
    if (files.length > maxFiles) {
      return json({ ok: false, error: "TOO_MANY_FILES", message: `Máximo de ${maxFiles} arquivos por upload.`, requestId }, 413, requestId)
    }

    const maxMb = 15
    const maxBytes = maxMb * 1024 * 1024

    const uploaded: { key: string; url: string; originalName: string; contentType: string; size: number }[] = []

    for (const file of files) {
      const contentType = (file.type || "").toLowerCase()
      const ext = extFromMime(contentType)
      if (!ext) {
        return json(
          { ok: false, error: "UNSUPPORTED_TYPE", message: `Tipo não suportado: ${file.type || "desconhecido"}.`, requestId },
          415,
          requestId
        )
      }

      if (file.size > maxBytes) {
        return json(
          { ok: false, error: "FILE_TOO_LARGE", message: `Arquivo maior que ${maxMb}MB: ${file.name}`, requestId },
          413,
          requestId
        )
      }

      const bytes = await file.arrayBuffer()
      const body = Buffer.from(bytes)

      const key = `obras/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

      await getS3Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType || "application/octet-stream",
        })
      )

      uploaded.push({
        key,
        url: publicUrlForKey(key),
        originalName: file.name,
        contentType: contentType || "application/octet-stream",
        size: file.size,
      })
    }

    return json({ ok: true, files: uploaded, urls: uploaded.map((f) => f.url), requestId }, 201, requestId)
  } catch (err: unknown) {
    return json(
      { ok: false, error: "UPLOAD_FAILED", message: "Falha ao enviar imagens.", detail: err instanceof Error ? err.message : String(err), requestId },
      500,
      requestId
    )
  }
}
