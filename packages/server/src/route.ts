import {
  type FileDescriptor,
  type StoredObject,
  type UploadRouteAction,
  type UploadRouteRequest,
  matchesAccept,
} from "@uploadcn/core"

import type { ScanResult, Scanner } from "./scan"
import type { UploadStorage } from "./storage"

export class UploadRouteError extends Error {
  override readonly name = "UploadRouteError"
  constructor(
    message: string,
    readonly status = 400,
    /** `"rejected"` tells the client the file itself was refused (no retry). */
    readonly code?: "rejected"
  ) {
    super(message)
  }
}

export interface UploadScanOptions<TAuth> {
  /** `clamavScanner()`, `virusTotalScanner()`, `httpScanner()` or your own. */
  scanner: Scanner
  /**
   * What to do when the scanner can't decide, or fails: `"reject"` (default,
   * fail closed) deletes the file; `"allow"` keeps it.
   */
  onUnknown?: "reject" | "allow"
  /** Files larger than this (bytes) are not scanned and count as unknown. */
  maxFileSize?: number
  /** Every verdict, for logging, alerts or an audit trail. */
  onResult?: (
    context: UploadRouteContext<TAuth> & {
      key: string
      file: FileDescriptor
      result: ScanResult
    }
  ) => void | Promise<void>
}

export interface UploadRouteContext<TAuth> {
  request: Request
  action: UploadRouteAction
  /** Value returned by `authorize`. */
  auth: TAuth
}

export interface UploadRouteOptions<TAuth = undefined> {
  storage: UploadStorage
  /**
   * Runs before every action. Return a value (user, tenant…) to pass along,
   * or throw `UploadRouteError` to deny. For multipart actions, `key` is
   * provided so you can verify the caller owns it.
   */
  authorize?: (context: {
    request: Request
    action: UploadRouteAction
    key?: string
  }) => TAuth | Promise<TAuth>
  /** Largest allowed file in bytes. Enforced by the signature for single PUTs. */
  maxFileSize?: number
  /** Allowed types, in `<input accept>` syntax (`image/*`, `.pdf`…). */
  allowedTypes?: string | readonly string[]
  /** Builds the object key. Default: `<uuid>/<sanitized file name>`. */
  getKey?: (
    context: UploadRouteContext<TAuth> & {
      file: FileDescriptor
      meta: Record<string, unknown>
    }
  ) => string | Promise<string>
  /** Signed URL lifetime in seconds. Default 3600. */
  expiresIn?: number
  /**
   * Called once an upload is stored, verified and (with `scan`) found clean:
   * save metadata, trigger processing. The return value is sent to the
   * client as `result.data`.
   */
  onUploadComplete?: (
    context: UploadRouteContext<TAuth> & {
      key: string
      url: string
      file: FileDescriptor
      meta: Record<string, unknown>
      /** The scan verdict, when `scan` is set. */
      scan?: ScanResult
    }
  ) => unknown
  /** Check that the object exists (HEAD) before completing. Default `true`. */
  verify?: boolean
  /**
   * Scan every upload for malware before it completes. Infected files are
   * deleted and the client sees the item as rejected. Requires a storage
   * that can read objects (`s3Storage`, `r2Storage`, `createFileSystemStorage`).
   */
  scan?: UploadScanOptions<TAuth>
}

const MAX_PARTS = 10_000

export function sanitizeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(-120)
  return cleaned || "file"
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireString(body: Record<string, unknown>, field: string) {
  const value = body[field]
  if (typeof value !== "string" || value.length === 0 || value.length > 1024) {
    throw new UploadRouteError(`Invalid "${field}"`)
  }
  return value
}

function requireFile(body: Record<string, unknown>): FileDescriptor {
  const file = body.file
  if (!isRecord(file)) throw new UploadRouteError('Invalid "file"')
  const { name, type, size } = file
  if (
    typeof name !== "string" ||
    typeof type !== "string" ||
    typeof size !== "number"
  ) {
    throw new UploadRouteError('Invalid "file"')
  }
  if (!Number.isSafeInteger(size) || size < 0)
    throw new UploadRouteError("Invalid file size")
  return {
    name: name.slice(0, 255),
    type: type || "application/octet-stream",
    size,
  }
}

function readMeta(body: Record<string, unknown>) {
  return isRecord(body.meta) ? body.meta : {}
}

function parseRequest(body: unknown): UploadRouteRequest {
  if (!isRecord(body)) throw new UploadRouteError("Expected a JSON object")
  const action = body.action
  switch (action) {
    case "presign":
    case "create-multipart":
      return { action, file: requireFile(body), meta: readMeta(body) }
    case "complete":
      return {
        action,
        key: requireString(body, "key"),
        file: requireFile(body),
        meta: readMeta(body),
      }
    case "sign-part": {
      const partNumber = body.partNumber
      if (
        typeof partNumber !== "number" ||
        !Number.isInteger(partNumber) ||
        partNumber < 1 ||
        partNumber > MAX_PARTS
      ) {
        throw new UploadRouteError('Invalid "partNumber"')
      }
      return {
        action,
        key: requireString(body, "key"),
        uploadId: requireString(body, "uploadId"),
        partNumber,
      }
    }
    case "list-parts":
    case "abort-multipart":
      return {
        action,
        key: requireString(body, "key"),
        uploadId: requireString(body, "uploadId"),
      }
    case "complete-multipart": {
      const parts = body.parts
      if (
        !Array.isArray(parts) ||
        parts.length === 0 ||
        parts.length > MAX_PARTS
      ) {
        throw new UploadRouteError('Invalid "parts"')
      }
      return {
        action,
        key: requireString(body, "key"),
        uploadId: requireString(body, "uploadId"),
        file: requireFile(body),
        meta: readMeta(body),
        parts: parts.map((part) => {
          if (
            !isRecord(part) ||
            typeof part.partNumber !== "number" ||
            typeof part.etag !== "string"
          ) {
            throw new UploadRouteError('Invalid "parts"')
          }
          return { partNumber: part.partNumber, etag: part.etag }
        }),
      }
    }
    default:
      throw new UploadRouteError('Unknown "action"')
  }
}

/**
 * A single POST endpoint that signs uploads for the browser's `s3Adapter`.
 * It speaks Web standard `Request`/`Response`, so it mounts directly in
 * Next.js route handlers, TanStack Start server routes, Hono, Remix, Bun,
 * Deno and Cloudflare Workers.
 *
 * @example
 * // app/api/upload/route.ts
 * export const { POST } = createUploadRoute({ storage: s3Storage({...}) })
 */
export function createUploadRoute<TAuth = undefined>(
  options: UploadRouteOptions<TAuth>
) {
  const { storage } = options
  const expiresIn = options.expiresIn ?? 3600
  if (options.scan && !storage.getObject) {
    throw new Error(
      `[uploadcn] scan needs a storage that can read objects; "${storage.name}" can't`
    )
  }

  async function scanObject(
    context: UploadRouteContext<TAuth>,
    key: string,
    file: FileDescriptor,
    size: number | undefined
  ): Promise<ScanResult> {
    const scan = options.scan!
    let result: ScanResult
    try {
      if (scan.maxFileSize != null && (size ?? file.size) > scan.maxFileSize) {
        result = {
          status: "unknown",
          threats: [],
          scanner: scan.scanner.name,
          details: { skipped: "too large" },
        }
      } else {
        const stream = await storage.getObject!(key)
        if (!stream) throw new UploadRouteError("Upload not found", 409)
        result = await scan.scanner.scan({
          stream,
          file,
          key,
          signal: context.request.signal,
        })
      }
    } catch (error) {
      if (error instanceof UploadRouteError) throw error
      console.error("[uploadcn] virus scan failed", error)
      result = {
        status: "unknown",
        threats: [],
        scanner: scan.scanner.name,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
    await scan.onResult?.({ ...context, key, file, result })
    const reject =
      result.status === "infected" ||
      (result.status === "unknown" && (scan.onUnknown ?? "reject") === "reject")
    if (reject) {
      await storage.deleteObject(key)
      throw new UploadRouteError(
        result.status === "infected"
          ? "This file contains malware and was removed"
          : "This file couldn't be scanned and was removed",
        422,
        "rejected"
      )
    }
    return result
  }

  function checkFile(file: FileDescriptor) {
    if (options.maxFileSize != null && file.size > options.maxFileSize) {
      throw new UploadRouteError("File is too large", 413)
    }
    if (options.allowedTypes && !matchesAccept(file, options.allowedTypes)) {
      throw new UploadRouteError("File type is not allowed", 415)
    }
  }

  async function finalize(
    context: UploadRouteContext<TAuth>,
    key: string,
    file: FileDescriptor,
    meta: Record<string, unknown>,
    etag?: string
  ): Promise<StoredObject> {
    let size: number | undefined
    if (options.verify ?? true) {
      const info = await storage.headObject(key)
      size = info?.size
      if (info === null) throw new UploadRouteError("Upload not found", 409)
      if (
        info &&
        options.maxFileSize != null &&
        info.size > options.maxFileSize
      ) {
        await storage.deleteObject(key)
        throw new UploadRouteError("File is too large", 413)
      }
      etag ??= info?.etag
    }
    const scan = options.scan
      ? await scanObject(context, key, file, size)
      : undefined
    const url = await storage.getUrl(key)
    const data = await options.onUploadComplete?.({
      ...context,
      key,
      url,
      file,
      meta,
      scan,
    })
    return {
      key,
      url,
      etag,
      ...(data === undefined ? {} : { data }),
      ...(scan
        ? {
            scan: {
              status: scan.status === "clean" ? "clean" : "unknown",
              scanner: scan.scanner,
            },
          }
        : {}),
    }
  }

  async function handle(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405)
      }
      let body: unknown
      try {
        body = await request.json()
      } catch {
        throw new UploadRouteError("Expected a JSON body")
      }
      const input = parseRequest(body)
      const auth = (await options.authorize?.({
        request,
        action: input.action,
        key: "key" in input ? input.key : undefined,
      })) as TAuth
      const context: UploadRouteContext<TAuth> = {
        request,
        action: input.action,
        auth,
      }

      switch (input.action) {
        case "presign": {
          checkFile(input.file)
          const key = await resolveKey(context, input.file, input.meta ?? {})
          const signed = await storage.presignPut({
            key,
            contentType: input.file.type,
            contentLength: input.file.size,
            expiresIn,
          })
          return json({
            key,
            url: signed.url,
            method: "PUT",
            headers: signed.headers,
          })
        }
        case "complete":
          checkFile(input.file)
          return json(
            await finalize(context, input.key, input.file, input.meta ?? {})
          )
        case "create-multipart": {
          checkFile(input.file)
          const key = await resolveKey(context, input.file, input.meta ?? {})
          const { uploadId } = await storage.createMultipart({
            key,
            contentType: input.file.type,
          })
          return json({ key, uploadId })
        }
        case "sign-part":
          return json({
            url: await storage.presignPart({ ...input, expiresIn }),
          })
        case "list-parts":
          return json({ parts: await storage.listParts(input) })
        case "complete-multipart": {
          checkFile(input.file)
          const { etag } = await storage.completeMultipart(input)
          return json(
            await finalize(
              context,
              input.key,
              input.file,
              input.meta ?? {},
              etag
            )
          )
        }
        case "abort-multipart":
          await storage.abortMultipart(input)
          return json({ ok: true })
      }
    } catch (error) {
      if (error instanceof UploadRouteError) {
        return json(
          error.code
            ? { error: error.message, code: error.code }
            : { error: error.message },
          error.status
        )
      }
      console.error("[uploadcn] upload route error", error)
      return json({ error: "Upload failed" }, 500)
    }
  }

  async function resolveKey(
    context: UploadRouteContext<TAuth>,
    file: FileDescriptor,
    meta: Record<string, unknown>
  ) {
    if (options.getKey) return options.getKey({ ...context, file, meta })
    return `${crypto.randomUUID()}/${sanitizeFileName(file.name)}`
  }

  return { POST: handle, handler: handle }
}
