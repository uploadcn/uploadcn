import { createUrlSigner, sha256Hex } from "./signing"
import type { StoredObjectInfo, UploadStorage } from "./storage"

export interface MemoryStorageOptions {
  /**
   * Absolute or root-relative URL where `handler` is mounted, e.g.
   * `/api/storage`. Presigned URLs point here.
   */
  baseUrl: string
  /** HMAC secret used to sign URLs. Use a random value per deployment. */
  secret: string
  /** Largest accepted request body, in bytes. Default 5 GiB. */
  maxBodySize?: number
}

/**
 * A development storage that accepts uploads in-process and keeps only
 * metadata (size, ETag) — the bytes are discarded. It implements the full
 * presigned + multipart flow with HMAC-signed URLs, so you can build and
 * test upload UIs without cloud credentials. Not for production.
 */
export function createMemoryStorage(options: MemoryStorageOptions) {
  const objects = new Map<string, StoredObjectInfo>()
  const maxBodySize = options.maxBodySize ?? 5 * 1024 ** 3
  const { base, sign, verify } = createUrlSigner(
    options.secret,
    options.baseUrl
  )

  const storage: UploadStorage = {
    name: "memory",
    async presignPut({ key, contentType, contentLength, expiresIn }) {
      const url = await sign({
        key,
        method: "PUT",
        size: contentLength,
        expires: Date.now() + expiresIn * 1000,
      })
      return { url, headers: { "content-type": contentType } }
    },
    async createMultipart() {
      return { uploadId: crypto.randomUUID() }
    },
    presignPart({ key, uploadId, partNumber, expiresIn }) {
      return sign({
        key,
        method: "PUT",
        uploadId,
        partNumber,
        expires: Date.now() + expiresIn * 1000,
      })
    },
    // Parts are not tracked between requests; clients keep their own record.
    async listParts() {
      return null
    },
    async completeMultipart({ key, parts }) {
      // Part ETags encode their size, so completion needs no stored state.
      const size = parts.reduce(
        (total, part) =>
          total + Number(part.etag.replace(/"/g, "").split("-")[0]),
        0
      )
      const etag = `"${parts.length}-${size}"`
      objects.set(key, { size, etag })
      return { etag }
    },
    async abortMultipart() {},
    async headObject(key) {
      return objects.get(key)
    },
    async deleteObject(key) {
      objects.delete(key)
    },
    async getUrl(key) {
      return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`
    },
  }

  /** Handles the signed PUT requests. Mount it at `baseUrl`. */
  async function handler(request: Request): Promise<Response> {
    if (request.method !== "PUT") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "PUT" },
      })
    }
    const token = await verify(new URL(request.url).searchParams.get("token"))
    if (!token || token.method !== "PUT")
      return new Response("Invalid or expired signature", { status: 403 })
    const declared = Number(request.headers.get("content-length") ?? NaN)
    if (declared > maxBodySize)
      return new Response("Payload too large", { status: 413 })
    const body = await request.arrayBuffer()
    if (token.size != null && body.byteLength !== token.size) {
      return new Response("Body size does not match the signed size", {
        status: 400,
      })
    }
    const etag = `"${body.byteLength}-${await sha256Hex(body)}"`
    if (token.uploadId == null) {
      objects.set(token.key, {
        size: body.byteLength,
        etag,
        contentType: request.headers.get("content-type") ?? undefined,
      })
    }
    return new Response(null, {
      status: 200,
      headers: { etag, "access-control-expose-headers": "ETag" },
    })
  }

  return { storage, handler }
}
