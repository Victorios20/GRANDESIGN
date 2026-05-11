import { PutObjectCommand } from "@aws-sdk/client-s3"
import { NextRequest, NextResponse } from "next/server"
import { s3 } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const MAX_MB = 20
const MAX_BYTES = MAX_MB * 1024 * 1024

const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/msword": "doc",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
}

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

function sanitizeExtension(value: string | null | undefined) {
  const extension = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!extension) return null
  return extension.slice(0, 10)
}

function getExtensionFromMime(contentType: string) {
  const mime = (contentType || "").toLowerCase().trim()
  if (!mime || mime === "application/octet-stream") return null
  const mapped = MIME_EXTENSION_MAP[mime]
  if (mapped) return mapped

  const subtype = mime.split("/")[1]?.split(";")[0] ?? ""
  if (/^[a-z0-9]{1,10}$/i.test(subtype)) {
    return subtype.toLowerCase()
  }

  return null
}

function getExtensionFromName(fileName: string) {
  const match = /\.([^.]+)$/.exec(fileName)
  return sanitizeExtension(match?.[1] ?? null)
}

function resolveFileExtension(file: File) {
  return (
    sanitizeExtension(getExtensionFromMime(file.type)) ??
    getExtensionFromName(file.name) ??
    "bin"
  )
}

export async function POST(req: NextRequest) {
  const requestId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  try {
    const bucket = process.env.S3_BUCKET
    if (!bucket) {
      return json({ ok: false, error: "S3_BUCKET_MISSING", requestId }, 500, requestId)
    }

    const form = await req.formData()
    const file = form.get("file")

    if (!file || !(file instanceof File)) {
      return json(
        {
          ok: false,
          error: "NO_FILE",
          message: "Envie 'file' via multipart/form-data.",
          requestId,
        },
        400,
        requestId
      )
    }

    if (file.size > MAX_BYTES) {
      return json(
        {
          ok: false,
          error: "FILE_TOO_LARGE",
          message: `Arquivo maior que ${MAX_MB}MB.`,
          requestId,
        },
        413,
        requestId
      )
    }

    const contentType = (file.type || "").toLowerCase().trim() || "application/octet-stream"
    const extension = resolveFileExtension(file)
    const body = Buffer.from(await file.arrayBuffer())
    const key = `contratos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )

    return json(
      {
        ok: true,
        url: publicUrlForKey(key),
        key,
        originalName: file.name,
        contentType,
        size: file.size,
        requestId,
      },
      201,
      requestId
    )
  } catch (err: unknown) {
    return json(
      {
        ok: false,
        error: "UPLOAD_FAILED",
        message: "Falha ao enviar contrato.",
        detail: err instanceof Error ? err.message : String(err),
        requestId,
      },
      500,
      requestId
    )
  }
}
