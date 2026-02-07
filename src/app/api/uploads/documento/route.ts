// src/app/api/uploads/documento/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

function json(body: any, status = 200, requestId?: string) {
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

const ALLOWED_TYPES = [
    "application/pdf",
]

function extFromMime(mime: string): string | null {
    const m = (mime || "").toLowerCase().trim()
    if (m === "application/pdf") return "pdf"
    return null
}

export async function POST(req: NextRequest) {
    const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    try {
        const bucket = process.env.S3_BUCKET
        if (!bucket) return json({ ok: false, error: "S3_BUCKET_MISSING", requestId }, 500, requestId)

        const form = await req.formData()
        const file = form.get("file")

        if (!file || !(file instanceof File)) {
            return json({ ok: false, error: "NO_FILE", message: "Envie 'file' via multipart/form-data.", requestId }, 400, requestId)
        }

        const contentType = (file.type || "").toLowerCase()
        const ext = extFromMime(contentType)

        if (!ext) {
            return json(
                { ok: false, error: "UNSUPPORTED_TYPE", message: `Tipo não suportado: ${file.type || "desconhecido"}. Apenas PDF é permitido.`, requestId },
                415,
                requestId
            )
        }

        const maxMb = 20
        const maxBytes = maxMb * 1024 * 1024

        if (file.size > maxBytes) {
            return json(
                { ok: false, error: "FILE_TOO_LARGE", message: `Arquivo maior que ${maxMb}MB.`, requestId },
                413,
                requestId
            )
        }

        const bytes = await file.arrayBuffer()
        const body = Buffer.from(bytes)

        // Path: documentos/{date}/{uuid}.pdf
        const key = `documentos/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: contentType || "application/pdf",
            })
        )

        const url = publicUrlForKey(key)

        return json({
            ok: true,
            url,
            key,
            originalName: file.name,
            contentType,
            size: file.size,
            requestId,
        }, 201, requestId)
    } catch (err: any) {
        return json(
            { ok: false, error: "UPLOAD_FAILED", message: "Falha ao enviar documento.", detail: String(err?.message ?? err), requestId },
            500,
            requestId
        )
    }
}
