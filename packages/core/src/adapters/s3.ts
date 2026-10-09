import { MiB } from "../chunk"
import { UploadError } from "../errors"
import type {
  CreateMultipartResponse,
  FileDescriptor,
  ListPartsResponse,
  PresignResponse,
  SignPartResponse,
  StoredObject,
  UploadRouteRequest,
} from "../protocol"
import type { UploadAdapter, UploadItem } from "../types"
import { type MultipartResumeState, multipartAdapter } from "./multipart"
import { type HeadersInput, ensureOk, postJson, resolveHeaders } from "./shared"
import { type Transport, xhrTransport } from "./transport"

export interface S3MultipartOptions {
  /** Files at or above this size use multipart. Default 64 MiB. */
  threshold?: number
  /** Preferred part size. Default 8 MiB. */
  partSize?: number
  /** Parallel parts per file. Default 4. */
  concurrency?: number
}

export interface S3AdapterOptions {
  /** Your upload route, e.g. `/api/upload` (see `@uploadcn/server`). */
  endpoint: string
  /** Headers for requests to your route (auth, CSRF…). */
  headers?: HeadersInput
  credentials?: RequestCredentials
  /** Multipart settings, or `false` to always use a single PUT. */
  multipart?: S3MultipartOptions | false
  fetch?: typeof fetch
  transport?: Transport
}

interface S3Session {
  key: string
  uploadId: string
}

function describe(file: File): FileDescriptor {
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
  }
}

/**
 * Direct-to-bucket uploads for S3 and any S3-compatible storage (Cloudflare
 * R2, MinIO, Backblaze B2, DigitalOcean Spaces, Wasabi…).
 *
 * Small files use a single presigned PUT; large files switch to a resumable
 * multipart upload with parallel parts. Your server only signs requests —
 * file bytes go straight to the bucket.
 *
 * Bucket CORS must allow `PUT` from your origin and expose the `ETag` header.
 */
export function s3Adapter(
  options: S3AdapterOptions
): UploadAdapter<StoredObject> {
  const transport = options.transport ?? xhrTransport
  const multipart =
    options.multipart === false ? null : (options.multipart ?? {})
  const threshold = multipart?.threshold ?? 64 * MiB

  async function call<T>(body: UploadRouteRequest, signal?: AbortSignal) {
    return postJson<T>(options.endpoint, body, {
      signal,
      headers: await resolveHeaders(options.headers),
      credentials: options.credentials,
      fetch: options.fetch,
    })
  }

  const usesMultipart = (file: File) => !!multipart && file.size >= threshold

  const single: UploadAdapter<StoredObject> = {
    name: "s3",
    async upload({ item, file, signal, onProgress }) {
      const descriptor = describe(file)
      const target = await call<PresignResponse>(
        { action: "presign", file: descriptor, meta: { ...item.meta } },
        signal
      )
      ensureOk(
        await transport({
          method: target.method,
          url: target.url,
          headers: target.headers,
          body: file,
          signal,
          onUploadProgress: (loaded) => onProgress(Math.min(loaded, file.size)),
        })
      )
      return call<StoredObject>(
        {
          action: "complete",
          key: target.key,
          file: descriptor,
          meta: { ...item.meta },
        },
        signal
      )
    },
  }

  const chunked = multipartAdapter<S3Session, StoredObject>({
    name: "s3",
    partSize: multipart?.partSize,
    concurrency: multipart?.concurrency,
    async create({ item, file, signal }) {
      const { key, uploadId } = await call<CreateMultipartResponse>(
        {
          action: "create-multipart",
          file: describe(file),
          meta: { ...item.meta },
        },
        signal
      )
      return { key, uploadId }
    },
    async uploadPart({ session, partNumber, blob, signal, onProgress }) {
      const { url } = await call<SignPartResponse>(
        { action: "sign-part", ...session, partNumber },
        signal
      )
      const response = ensureOk(
        await transport({
          method: "PUT",
          url,
          body: blob,
          signal,
          onUploadProgress: (loaded) => onProgress(loaded),
        })
      )
      const etag = response.headers.get("etag")
      if (!etag) {
        throw new UploadError(
          "Missing ETag on part upload. Add `ETag` to ExposeHeaders in your bucket CORS configuration.",
          { code: "http", status: response.status, retryable: false }
        )
      }
      return { etag }
    },
    listParts({ session, signal }) {
      return call<ListPartsResponse>(
        { action: "list-parts", ...session },
        signal
      ).then((response) => response.parts)
    },
    complete({ session, parts, item, file, signal }) {
      return call<StoredObject>(
        {
          action: "complete-multipart",
          ...session,
          parts: parts.map(({ partNumber, etag }) => ({ partNumber, etag })),
          file: describe(file),
          meta: { ...item.meta },
        },
        signal
      )
    },
    async abort({ session }) {
      await call({ action: "abort-multipart", ...session })
    },
  })

  return {
    name: "s3",
    resumable: usesMultipart,
    upload: (context) =>
      usesMultipart(context.file)
        ? chunked.upload(context)
        : single.upload(context),
    async abort(context) {
      if (usesMultipart(context.item.file)) await chunked.abort?.(context)
    },
  }
}

/**
 * Cloudflare R2 speaks the S3 API, so the browser side is identical — the
 * difference lives on the server (endpoint + `region: "auto"`). This alias
 * exists for discoverability.
 */
export const r2Adapter = s3Adapter

export type S3ResumeState = MultipartResumeState<S3Session>

/** For use in custom adapters: the item's S3 key once the upload has started. */
export function getS3Key(item: UploadItem): string | undefined {
  const state = item.resumeState as Partial<S3ResumeState> | null
  return state?.session?.key
}
