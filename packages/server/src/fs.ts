import { createHash, randomUUID } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"

import { createUrlSigner } from "./signing"
import type { StoragePart, StoredObjectInfo, UploadStorage } from "./storage"

export interface FileSystemStorageOptions {
  /** Folder where files are written, e.g. `./uploads`. */
  directory: string
  /**
   * URL where `handler` is mounted, e.g. `/api/files`. Signed upload and
   * download URLs point here.
   */
  baseUrl: string
  /** HMAC secret for signed URLs. Use a long random value. */
  secret: string
  /**
   * Serve files publicly from this URL (e.g. `/uploads` when `directory` is
   * inside `public/`). Without it, reads use short-lived signed URLs.
   */
  publicUrl?: string
  /** Largest accepted request body, in bytes. Default 5 GiB. */
  maxBodySize?: number
  /** Lifetime of signed download URLs, in seconds. Default 3600. */
  downloadExpiresIn?: number
}

const PARTS = ".parts"

class BodyTooLarge extends Error {}

/**
 * Stores uploads on the server's disk — for self-hosted apps, VPSs and
 * local development. Implements the full presigned and multipart flow, so
 * every UploadCN adapter and component works unchanged.
 *
 * Node.js only. Don't use it on serverless platforms with ephemeral disks.
 */
export function createFileSystemStorage(options: FileSystemStorageOptions) {
  const root = path.resolve(options.directory)
  const maxBodySize = options.maxBodySize ?? 5 * 1024 ** 3
  const { base, sign, verify } = createUrlSigner(
    options.secret,
    options.baseUrl
  )

  function resolveKey(key: string) {
    const normalized = path.posix.normalize(key.replace(/\\/g, "/"))
    if (
      !normalized ||
      normalized.startsWith("..") ||
      path.posix.isAbsolute(normalized) ||
      normalized.split("/").includes(PARTS)
    ) {
      throw new Error(`Invalid object key: ${key}`)
    }
    const target = path.join(root, normalized)
    if (!target.startsWith(root + path.sep)) {
      throw new Error(`Invalid object key: ${key}`)
    }
    return target
  }

  function partsDir(uploadId: string) {
    if (!/^[\w-]+$/.test(uploadId)) throw new Error("Invalid upload id")
    return path.join(root, PARTS, uploadId)
  }

  /** Streams a request body to disk, enforcing the size limit. */
  async function writeBody(
    body: ReadableStream<Uint8Array>,
    target: string,
    expectedSize?: number
  ) {
    await fs.mkdir(path.dirname(target), { recursive: true })
    const temporary = `${target}.${randomUUID()}.tmp`
    const hash = createHash("sha256")
    let size = 0
    const limit = expectedSize ?? maxBodySize
    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        size += chunk.length
        if (size > limit) return callback(new BodyTooLarge())
        hash.update(chunk)
        callback(null, chunk)
      },
    })
    try {
      await pipeline(
        Readable.fromWeb(body as NodeReadableStream),
        meter,
        createWriteStream(temporary)
      )
      if (expectedSize != null && size !== expectedSize) {
        throw new Error("Body size does not match the signed size")
      }
      await fs.rename(temporary, target)
    } catch (error) {
      await fs.rm(temporary, { force: true })
      throw error
    }
    return { size, etag: `"${size}-${hash.digest("hex").slice(0, 32)}"` }
  }

  const storage: UploadStorage = {
    name: "filesystem",
    async presignPut({ key, contentType, contentLength, expiresIn }) {
      resolveKey(key)
      const url = await sign({
        key,
        method: "PUT",
        size: contentLength,
        expires: Date.now() + expiresIn * 1000,
      })
      return { url, headers: { "content-type": contentType } }
    },
    async createMultipart({ key }) {
      resolveKey(key)
      const uploadId = randomUUID()
      await fs.mkdir(partsDir(uploadId), { recursive: true })
      return { uploadId }
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
    async listParts({ uploadId }) {
      const dir = partsDir(uploadId)
      const entries = await fs.readdir(dir).catch(() => null)
      if (!entries) return []
      const parts: StoragePart[] = []
      for (const entry of entries.filter((name) => name.endsWith(".json"))) {
        parts.push(JSON.parse(await fs.readFile(path.join(dir, entry), "utf8")))
      }
      return parts.sort((a, b) => a.partNumber - b.partNumber)
    },
    async completeMultipart({ key, uploadId, parts }) {
      const dir = partsDir(uploadId)
      const target = resolveKey(key)
      await fs.mkdir(path.dirname(target), { recursive: true })
      const temporary = `${target}.${randomUUID()}.tmp`
      const out = createWriteStream(temporary)
      let size = 0
      try {
        for (const part of [...parts].sort(
          (a, b) => a.partNumber - b.partNumber
        )) {
          const meta = JSON.parse(
            await fs.readFile(path.join(dir, `${part.partNumber}.json`), "utf8")
          ) as StoragePart
          if (meta.etag !== part.etag) {
            throw new Error(`Part ${part.partNumber} does not match its ETag`)
          }
          size += meta.size
          await pipeline(
            createReadStream(path.join(dir, String(part.partNumber))),
            out,
            {
              end: false,
            }
          )
        }
        await new Promise<void>((resolve, reject) =>
          out.end((error?: Error | null) => (error ? reject(error) : resolve()))
        )
        await fs.rename(temporary, target)
      } catch (error) {
        out.destroy()
        await fs.rm(temporary, { force: true })
        throw error
      }
      await fs.rm(dir, { recursive: true, force: true })
      return { etag: `"${parts.length}-${size}"` }
    },
    async abortMultipart({ uploadId }) {
      await fs.rm(partsDir(uploadId), { recursive: true, force: true })
    },
    async headObject(key): Promise<StoredObjectInfo | null> {
      const stat = await fs.stat(resolveKey(key)).catch(() => null)
      return stat?.isFile() ? { size: stat.size } : null
    },
    async deleteObject(key) {
      await fs.rm(resolveKey(key), { force: true })
    },
    async getObject(key) {
      const target = resolveKey(key)
      const stat = await fs.stat(target).catch(() => null)
      if (!stat?.isFile()) return null
      return Readable.toWeb(
        createReadStream(target)
      ) as unknown as ReadableStream<Uint8Array>
    },
    async getUrl(key) {
      resolveKey(key)
      if (options.publicUrl) {
        const prefix = options.publicUrl.replace(/\/+$/, "")
        return `${prefix}/${key.split("/").map(encodeURIComponent).join("/")}`
      }
      return sign({
        key,
        method: "GET",
        expires: Date.now() + (options.downloadExpiresIn ?? 3600) * 1000,
      })
    },
  }

  /**
   * Handles signed uploads (PUT) and downloads (GET). Mount it at
   * `baseUrl`, e.g. `export { handler as GET, handler as PUT }`.
   */
  async function handler(request: Request): Promise<Response> {
    if (request.method !== "PUT" && request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, PUT" },
      })
    }
    const token = await verify(new URL(request.url).searchParams.get("token"))
    if (!token || token.method !== request.method) {
      return new Response("Invalid or expired signature", { status: 403 })
    }

    if (request.method === "GET") {
      const file = resolveKey(token.key)
      const stat = await fs.stat(file).catch(() => null)
      if (!stat?.isFile()) return new Response("Not found", { status: 404 })
      return new Response(
        Readable.toWeb(createReadStream(file)) as ReadableStream,
        {
          headers: {
            "content-length": String(stat.size),
            "content-type": "application/octet-stream",
            "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`,
            "x-content-type-options": "nosniff",
          },
        }
      )
    }

    const declared = Number(request.headers.get("content-length") ?? NaN)
    if (declared > maxBodySize) {
      return new Response("Payload too large", { status: 413 })
    }
    if (!request.body) return new Response("Empty body", { status: 400 })
    try {
      if (token.uploadId != null && token.partNumber != null) {
        const dir = partsDir(token.uploadId)
        const stat = await fs.stat(dir).catch(() => null)
        if (!stat) return new Response("Unknown upload", { status: 404 })
        const { size, etag } = await writeBody(
          request.body,
          path.join(dir, String(token.partNumber))
        )
        const meta: StoragePart = { partNumber: token.partNumber, etag, size }
        await fs.writeFile(
          path.join(dir, `${token.partNumber}.json`),
          JSON.stringify(meta)
        )
        return new Response(null, {
          status: 200,
          headers: { etag, "access-control-expose-headers": "ETag" },
        })
      }
      const { etag } = await writeBody(
        request.body,
        resolveKey(token.key),
        token.size
      )
      return new Response(null, {
        status: 200,
        headers: { etag, "access-control-expose-headers": "ETag" },
      })
    } catch (error) {
      if (error instanceof BodyTooLarge) {
        return new Response("Payload too large", { status: 413 })
      }
      return new Response(
        error instanceof Error ? error.message : "Upload failed",
        { status: 400 }
      )
    }
  }

  return { storage, handler, baseUrl: base }
}
