import { UploadError, abortError } from "../errors"

export interface TransportRequest {
  method: string
  url: string
  headers?: Record<string, string>
  body?: XMLHttpRequestBodyInit | null
  signal?: AbortSignal
  /** Upload progress in bytes. */
  onUploadProgress?: (loaded: number, total: number) => void
  withCredentials?: boolean
  /** Milliseconds; `0` disables the timeout. */
  timeout?: number
}

export interface TransportResponse {
  status: number
  headers: Headers
  body: string
}

/**
 * Sends an HTTP request. Resolves for every HTTP status; rejects only for
 * network failures, timeouts and aborts. Swap it in tests or to add auth.
 */
export type Transport = (
  request: TransportRequest
) => Promise<TransportResponse>

function parseHeaders(raw: string): Headers {
  const headers = new Headers()
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const index = line.indexOf(":")
    if (index > 0) {
      headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim())
    }
  }
  return headers
}

/**
 * The default transport. Uses XMLHttpRequest because it is still the only
 * cross-browser way to observe upload progress (fetch has no upload events).
 */
export const xhrTransport: Transport = (request) =>
  new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      reject(new Error("xhrTransport requires XMLHttpRequest"))
      return
    }
    const { signal } = request
    if (signal?.aborted) {
      reject(abortError(signal.reason))
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open(request.method, request.url, true)
    xhr.withCredentials = request.withCredentials ?? false
    xhr.timeout = request.timeout ?? 0
    for (const [name, value] of Object.entries(request.headers ?? {})) {
      xhr.setRequestHeader(name, value)
    }
    if (request.onUploadProgress) {
      const report = request.onUploadProgress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) report(event.loaded, event.total)
      }
    }
    const onAbort = () => xhr.abort()
    signal?.addEventListener("abort", onAbort, { once: true })
    const cleanup = () => signal?.removeEventListener("abort", onAbort)

    xhr.onload = () => {
      cleanup()
      resolve({
        status: xhr.status,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        body: xhr.responseText,
      })
    }
    xhr.onerror = () => {
      cleanup()
      reject(
        new UploadError("Network error while uploading", {
          code: "network",
          retryable: true,
        })
      )
    }
    xhr.ontimeout = () => {
      cleanup()
      reject(
        new UploadError("Upload timed out", {
          code: "timeout",
          retryable: true,
        })
      )
    }
    xhr.onabort = () => {
      cleanup()
      reject(abortError(signal?.reason))
    }
    xhr.send(request.body ?? null)
  })
