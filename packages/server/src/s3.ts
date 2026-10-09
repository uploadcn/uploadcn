import { AwsClient } from "aws4fetch"

import type { PresignedRequest, StoragePart, UploadStorage } from "./storage"

export interface S3StorageOptions {
  bucket: string
  /** AWS region, or `"auto"` for R2. */
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  /**
   * Custom endpoint for S3-compatible services (R2, MinIO, B2, Spaces…).
   * Defaults to AWS.
   */
  endpoint?: string
  /** Use `endpoint/bucket/key` URLs. Defaults to `true` with a custom endpoint. */
  forcePathStyle?: boolean
  /**
   * Base URL for reading objects (a CDN or public bucket domain). Without
   * it, `getUrl` returns a signed GET URL valid for `readUrlExpiresIn`.
   */
  publicUrl?: string
  /** Seconds. Default 3600. */
  readUrlExpiresIn?: number
}

function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/")
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function unescapeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match ? unescapeXml(match[1]!) : undefined
}

function readAll(xml: string, tag: string) {
  return [
    ...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g")),
  ].map((match) => match[1]!)
}

export class S3StorageError extends Error {
  override readonly name = "S3StorageError"
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
  }
}

async function assertOk(response: Response, operation: string) {
  const body = await response.text()
  // CompleteMultipartUpload can fail with a 200 and an <Error> body.
  if (response.ok && !body.includes("<Error>")) return body
  const code = readTag(body, "Code")
  const message = readTag(body, "Message") ?? response.statusText
  throw new S3StorageError(
    `${operation} failed: ${code ?? response.status} ${message}`,
    response.status,
    code
  )
}

/**
 * Amazon S3 and any S3-compatible service, signed with SigV4 via aws4fetch.
 * Runs on Node, Bun, Deno, Cloudflare Workers and edge runtimes.
 */
export function s3Storage(options: S3StorageOptions): UploadStorage {
  const client = new AwsClient({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    sessionToken: options.sessionToken,
    service: "s3",
    region: options.region,
  })
  const pathStyle = options.forcePathStyle ?? !!options.endpoint
  const endpoint = (
    options.endpoint ?? `https://s3.${options.region}.amazonaws.com`
  ).replace(/\/+$/, "")
  const readExpiry = options.readUrlExpiresIn ?? 3600

  function objectUrl(key: string, query: Record<string, string> = {}) {
    const base = pathStyle
      ? `${endpoint}/${options.bucket}/${encodeKey(key)}`
      : `${endpoint.replace("://", `://${options.bucket}.`)}/${encodeKey(key)}`
    const url = new URL(base)
    for (const [name, value] of Object.entries(query))
      url.searchParams.set(name, value)
    return url
  }

  async function presign(
    method: string,
    url: URL,
    expiresIn: number,
    headers: Record<string, string> = {}
  ): Promise<string> {
    url.searchParams.set("X-Amz-Expires", String(expiresIn))
    const signed = await client.sign(new Request(url, { method, headers }), {
      aws: { signQuery: true, allHeaders: true },
    })
    return signed.url
  }

  return {
    name: "s3",

    async presignPut({
      key,
      contentType,
      contentLength,
      expiresIn,
    }): Promise<PresignedRequest> {
      // Signing content-length makes S3 reject bodies of any other size.
      const signedHeaders = {
        "content-type": contentType,
        "content-length": String(contentLength),
      }
      const url = await presign("PUT", objectUrl(key), expiresIn, signedHeaders)
      // Browsers set Content-Length themselves; only send Content-Type.
      return { url, headers: { "content-type": contentType } }
    },

    async createMultipart({ key, contentType }) {
      const response = await client.fetch(objectUrl(key, { uploads: "" }), {
        method: "POST",
        headers: { "content-type": contentType },
      })
      const body = await assertOk(response, "CreateMultipartUpload")
      const uploadId = readTag(body, "UploadId")
      if (!uploadId)
        throw new S3StorageError(
          "CreateMultipartUpload returned no UploadId",
          502
        )
      return { uploadId }
    },

    presignPart({ key, uploadId, partNumber, expiresIn }) {
      return presign(
        "PUT",
        objectUrl(key, { partNumber: String(partNumber), uploadId }),
        expiresIn
      )
    },

    async listParts({ key, uploadId }) {
      const parts: StoragePart[] = []
      let marker: string | undefined
      for (;;) {
        const query: Record<string, string> = { uploadId }
        if (marker) query["part-number-marker"] = marker
        const response = await client.fetch(objectUrl(key, query), {
          method: "GET",
        })
        const body = await assertOk(response, "ListParts")
        for (const part of readAll(body, "Part")) {
          parts.push({
            partNumber: Number(readTag(part, "PartNumber")),
            etag: readTag(part, "ETag") ?? "",
            size: Number(readTag(part, "Size")),
          })
        }
        if (readTag(body, "IsTruncated") !== "true") break
        marker = readTag(body, "NextPartNumberMarker")
        if (!marker) break
      }
      return parts
    },

    async completeMultipart({ key, uploadId, parts }) {
      const xml =
        "<CompleteMultipartUpload>" +
        [...parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map(
            (part) =>
              `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${escapeXml(part.etag)}</ETag></Part>`
          )
          .join("") +
        "</CompleteMultipartUpload>"
      const response = await client.fetch(objectUrl(key, { uploadId }), {
        method: "POST",
        headers: { "content-type": "application/xml" },
        body: xml,
      })
      const body = await assertOk(response, "CompleteMultipartUpload")
      return { etag: readTag(body, "ETag") }
    },

    async abortMultipart({ key, uploadId }) {
      const response = await client.fetch(objectUrl(key, { uploadId }), {
        method: "DELETE",
      })
      // 404 means it is already gone, which is what we wanted.
      if (response.status !== 404)
        await assertOk(response, "AbortMultipartUpload")
    },

    async headObject(key) {
      const response = await client.fetch(objectUrl(key), { method: "HEAD" })
      if (response.status === 404) return null
      if (!response.ok) await assertOk(response, "HeadObject")
      return {
        size: Number(response.headers.get("content-length") ?? 0),
        etag: response.headers.get("etag") ?? undefined,
        contentType: response.headers.get("content-type") ?? undefined,
      }
    },

    async deleteObject(key) {
      const response = await client.fetch(objectUrl(key), { method: "DELETE" })
      if (response.status !== 404) await assertOk(response, "DeleteObject")
    },

    async getObject(key) {
      const response = await client.fetch(objectUrl(key))
      if (response.status === 404) return null
      if (!response.ok) await assertOk(response, "GetObject")
      return response.body
    },

    async getUrl(key) {
      if (options.publicUrl) {
        return `${options.publicUrl.replace(/\/+$/, "")}/${encodeKey(key)}`
      }
      return presign("GET", objectUrl(key), readExpiry)
    },
  }
}

export interface R2StorageOptions extends Omit<
  S3StorageOptions,
  "region" | "endpoint" | "forcePathStyle"
> {
  /** Your Cloudflare account id. */
  accountId: string
  /** `"eu"` or `"fedramp"` for jurisdiction-restricted buckets. */
  jurisdiction?: "eu" | "fedramp"
}

/** Cloudflare R2 through its S3-compatible API. */
export function r2Storage({
  accountId,
  jurisdiction,
  ...options
}: R2StorageOptions): UploadStorage {
  const host = jurisdiction
    ? `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
    : `${accountId}.r2.cloudflarestorage.com`
  return {
    ...s3Storage({
      ...options,
      region: "auto",
      endpoint: `https://${host}`,
      forcePathStyle: true,
    }),
    name: "r2",
  }
}
