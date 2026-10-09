import type { UploadAdapter, UploadItem } from "../types"
import { type MaybePromise, ensureOk, stripQuery } from "./shared"
import {
  type Transport,
  type TransportResponse,
  xhrTransport,
} from "./transport"

/** Where and how to send the bytes, as returned by your backend. */
export interface PresignedTarget {
  url: string
  /** `PUT` for presigned URLs, `POST` for S3 POST policies. Default `PUT`. */
  method?: "PUT" | "POST"
  /** Headers that were signed and must be sent with the request. */
  headers?: Record<string, string>
  /** Form fields for POST policy uploads, sent before the file. */
  fields?: Record<string, string>
  /** Object key in the bucket. */
  key?: string
  /** Public URL of the object once uploaded, if known. */
  publicUrl?: string
}

export interface PresignedUploadResult {
  key: string | undefined
  url: string
}

export interface PresignedRequestContext {
  item: UploadItem
  file: File
  signal: AbortSignal
}

export interface PresignedAdapterOptions<TResult> {
  /** Ask your backend for a signed target (step 3 of the presigned flow). */
  getTarget: (context: PresignedRequestContext) => MaybePromise<PresignedTarget>
  /**
   * Tell your backend the upload finished so it can store metadata
   * (step 7). Its return value becomes the item's `result`.
   */
  complete?: (
    context: PresignedRequestContext & {
      target: PresignedTarget
      response: TransportResponse
    }
  ) => MaybePromise<TResult>
  timeout?: number
  transport?: Transport
}

/**
 * Uploads directly to object storage with a URL signed by your backend, so
 * file bytes never pass through your servers. Works with S3, R2, GCS, MinIO,
 * Backblaze B2, Supabase signed URLs and anything else that issues signed
 * PUT URLs or POST policies.
 */
export function presignedAdapter<TResult = PresignedUploadResult>(
  options: PresignedAdapterOptions<TResult>
): UploadAdapter<TResult> {
  const transport = options.transport ?? xhrTransport
  return {
    name: "presigned",
    resumable: false,
    async upload({ item, file, signal, onProgress }) {
      const context = { item, file, signal }
      const target = await options.getTarget(context)
      const method = target.method ?? "PUT"
      let body: XMLHttpRequestBodyInit = file
      const headers = { ...target.headers }
      if (method === "POST") {
        const form = new FormData()
        for (const [key, value] of Object.entries(target.fields ?? {})) {
          form.append(key, value)
        }
        form.append("file", file, file.name)
        body = form
      } else if (
        !Object.keys(headers).some((h) => h.toLowerCase() === "content-type")
      ) {
        headers["content-type"] = file.type || "application/octet-stream"
      }
      const response = ensureOk(
        await transport({
          method,
          url: target.url,
          headers,
          body,
          signal,
          timeout: options.timeout,
          onUploadProgress: (loaded, total) =>
            onProgress(total > 0 ? (loaded / total) * file.size : 0),
        })
      )
      if (options.complete) {
        return options.complete({ ...context, target, response })
      }
      const result: PresignedUploadResult = {
        key: target.key,
        url: target.publicUrl ?? stripQuery(target.url),
      }
      return result as TResult
    },
  }
}
