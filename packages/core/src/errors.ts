/**
 * Machine-readable categories for upload failures.
 *
 * - `network`    – the request never completed (connection reset, DNS, CORS…)
 * - `timeout`    – the request exceeded its timeout
 * - `http`       – the server answered with a non-2xx status
 * - `aborted`    – the request was aborted by the engine (pause / cancel)
 * - `offline`    – the browser reported it is offline
 * - `validation` – the file was rejected before uploading
 * - `rejected`   – the server rejected the file after upload (e.g. failed scan)
 * - `unknown`    – anything else
 */
export type UploadErrorCode =
  | "network"
  | "timeout"
  | "http"
  | "aborted"
  | "offline"
  | "validation"
  | "rejected"
  | "unknown"

export interface UploadErrorOptions {
  code: UploadErrorCode
  /** Whether the engine may retry the operation automatically. */
  retryable?: boolean
  /** HTTP status code, when the failure came from a response. */
  status?: number
  /** Server-requested delay before retrying, in milliseconds. */
  retryAfter?: number
  /** Arbitrary structured data (response body, validation issues, …). */
  details?: unknown
  cause?: unknown
}

export class UploadError extends Error {
  override readonly name = "UploadError"
  readonly code: UploadErrorCode
  readonly retryable: boolean
  readonly status: number | undefined
  readonly retryAfter: number | undefined
  readonly details: unknown

  constructor(message: string, options: UploadErrorOptions) {
    super(message, { cause: options.cause })
    this.code = options.code
    this.retryable = options.retryable ?? false
    this.status = options.status
    this.retryAfter = options.retryAfter
    this.details = options.details
  }
}

export function isUploadError(error: unknown): error is UploadError {
  return error instanceof UploadError
}

/** Statuses that are worth retrying: timeouts, rate limits and server errors. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

/** Parses a `Retry-After` header (seconds or HTTP date) into milliseconds. */
export function parseRetryAfter(
  value: string | null | undefined,
  now = Date.now()
) {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - now)
}

export function httpError(
  status: number,
  options: { body?: string; retryAfter?: string | null; message?: string } = {}
) {
  return new UploadError(
    options.message ?? `Upload failed with status ${status}`,
    {
      code: "http",
      status,
      retryable: isRetryableStatus(status),
      retryAfter: parseRetryAfter(options.retryAfter),
      details: options.body,
    }
  )
}

export function abortError(reason?: unknown) {
  return new UploadError("Upload aborted", {
    code: "aborted",
    retryable: false,
    cause: reason,
  })
}

export function isAbortError(error: unknown): boolean {
  if (isUploadError(error)) return error.code === "aborted"
  return error instanceof Error && error.name === "AbortError"
}

/** Normalizes anything thrown by an adapter into an {@link UploadError}. */
export function toUploadError(error: unknown): UploadError {
  if (isUploadError(error)) return error
  if (isAbortError(error)) return abortError(error)
  if (error instanceof TypeError) {
    // `fetch` rejects with a TypeError for network failures.
    return new UploadError(error.message || "Network error", {
      code: "network",
      retryable: true,
      cause: error,
    })
  }
  const message = error instanceof Error ? error.message : String(error)
  return new UploadError(message || "Upload failed", {
    code: "unknown",
    retryable: false,
    cause: error,
  })
}
