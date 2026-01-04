// src/lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3"

const endpoint = process.env.S3_ENDPOINT
const region = process.env.S3_REGION
const accessKeyId = process.env.S3_ACCESS_KEY_ID
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
  throw new Error("S3 env vars ausentes (S3_ENDPOINT/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY).")
}

export const s3 = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
})
