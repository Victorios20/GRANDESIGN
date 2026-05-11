import { S3Client } from "@aws-sdk/client-s3"

let s3Client: S3Client | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export function getS3Client() {
  if (s3Client) return s3Client

  const endpoint = getRequiredEnv("S3_ENDPOINT")
  const region = getRequiredEnv("S3_REGION")
  const accessKeyId = getRequiredEnv("S3_ACCESS_KEY_ID")
  const secretAccessKey = getRequiredEnv("S3_SECRET_ACCESS_KEY")

  s3Client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })

  return s3Client
}
