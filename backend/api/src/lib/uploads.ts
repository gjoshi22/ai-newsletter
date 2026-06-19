import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Env } from "./env";

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function validateImageMime(mime: string) {
  return allowedMime.has(mime);
}

function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export async function storeUpload(file: File, env: Env) {
  if (!validateImageMime(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF uploads are supported.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is too large. Please use an image under 8 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extensionForMime(file.type);
  const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  if (env.S3_BUCKET && env.S3_REGION) {
    const client = new S3Client({ region: env.S3_REGION });
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );
    const base = env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;
    return `${base}/${key}`;
  }

  const uploadRoot = path.resolve(env.UPLOAD_DIR);
  const filePath = path.join(uploadRoot, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return `${env.PUBLIC_UPLOAD_BASE_URL.replace(/\/$/, "")}/${key}`;
}
