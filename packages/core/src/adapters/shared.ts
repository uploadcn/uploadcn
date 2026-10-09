import { UploadError, httpError } from "../errors"
import type { TransportResponse } from "./transport"

export type MaybePromise<T> = T | Promise<T>
export type HeadersInput =
  Record<string, string> | (() => MaybePromise<Record<string, string>>)

export async function resolveHeaders(
  headers: HeadersInput | undefined
): Promise<Record<string, string>> {
  if (!headers) return {}
  return { ...(typeof headers === "function" ? await headers() : headers) }
}

export function ensureOk(response: TransportResponse) {
  if (response.status >= 200 && response.status < 300) return response
  throw httpError(response.status, {
    body: response.body,
    retryAfter: response.headers.get("retry-after"),
  })
}

export function parseBody(body: string): unknown {
  if (!body) return undefined
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

export interface JsonRequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  fetch?: typeof fetch
  credentials?: RequestCredentials
}

/** POSTs JSON and parses the JSON response, mapping failures to UploadError. */
export async function postJson<T>(
  url: string,
  body: unknown,
  options: JsonRequestOptions = {}
): Promise<T> {
  const fetcher = options.fetch ?? fetch
  const response = await fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...options.headers },
    body: JSON.stringify(body),
    signal: options.signal,
    credentials: options.credentials,
  })
  const text = await response.text()
  const parsed = parseBody(text)
  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : undefined
    // The server rejected the file itself (e.g. a failed virus scan):
    // final, never retried, shown as "rejected".
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { code?: unknown }).code === "rejected"
    ) {
      throw new UploadError(message ?? "File rejected", {
        code: "rejected",
        status: response.status,
        details: parsed,
      })
    }
    throw httpError(response.status, {
      body: text,
      retryAfter: response.headers.get("retry-after"),
      message,
    })
  }
  if (parsed === null || typeof parsed !== "object") {
    throw new UploadError("Expected a JSON object response", {
      code: "http",
      status: response.status,
      details: text,
    })
  }
  return parsed as T
}

/** Strips the query string from a presigned URL to get the object URL. */
export function stripQuery(url: string) {
  const index = url.indexOf("?")
  return index === -1 ? url : url.slice(0, index)
}
