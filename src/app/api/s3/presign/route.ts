import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const runtime = "nodejs"

function mustEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function sanitizeKey(k: string): string {
  const key = (k ?? "").trim().replace(/^\/+/, "")
  if (!key) throw new Error("Missing key")
  if (key.includes("..")) throw new Error("Invalid key")
  if (!key.startsWith("obras/")) throw new Error("Key not allowed")
  return key
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const keyRaw = searchParams.get("key") ?? ""
    const key = sanitizeKey(keyRaw)

    const region = mustEnv("S3_REGION")
    const bucket = mustEnv("S3_BUCKET")

    const accessKeyId = mustEnv("S3_ACCESS_KEY_ID")
    const secretAccessKey = mustEnv("S3_SECRET_ACCESS_KEY")

    const endpoint = process.env.S3_ENDPOINT

    const s3 = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: !!endpoint,
    })

    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 })

    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 400 }
    )
  }
}
