import type { UploadAdapter, UploadItem } from "../types"
import {
  type HeadersInput,
  type MaybePromise,
  ensureOk,
  parseBody,
  resolveHeaders,
} from "./shared"
import {
  type Transport,
  type TransportResponse,
  xhrTransport,
} from "./transport"

export interface HttpAdapterOptions<TResult> {
  /** Endpoint that receives the file. */
  url: string | ((item: UploadItem) => MaybePromise<string>)
  /** Default `POST`. */
  method?: "POST" | "PUT" | "PATCH"
  /**
   * `multipart` sends `FormData` (default); `binary` sends the raw file as
   * the request body with its MIME type.
   */
  body?: "multipart" | "binary"
  /** Form field name for the file. Default `file`. */
  fieldName?: string
  /** Extra form fields (multipart only). */
  fields?:
    | Record<string, string>
    | ((item: UploadItem) => MaybePromise<Record<string, string>>)
  headers?: HeadersInput
  withCredentials?: boolean
  timeout?: number
  /** Maps the response to a result. Defaults to parsed JSON or text. */
  parseResponse?: (response: TransportResponse) => TResult
  transport?: Transport
}

/**
 * Uploads to any HTTP endpoint you control, as `multipart/form-data` or a raw
 * body. Use it for simple backends, proxies or framework route handlers.
 */
export function httpAdapter<TResult = unknown>(
  options: HttpAdapterOptions<TResult>
): UploadAdapter<TResult> {
  const transport = options.transport ?? xhrTransport
  return {
    name: "http",
    resumable: false,
    async upload({ item, file, signal, onProgress }) {
      const url =
        typeof options.url === "function"
          ? await options.url(item)
          : options.url
      const headers = await resolveHeaders(options.headers)
      let body: XMLHttpRequestBodyInit
      if (options.body === "binary") {
        body = file
        headers["content-type"] ??= file.type || "application/octet-stream"
      } else {
        const form = new FormData()
        const fields =
          typeof options.fields === "function"
            ? await options.fields(item)
            : options.fields
        for (const [key, value] of Object.entries(fields ?? {})) {
          form.append(key, value)
        }
        form.append(options.fieldName ?? "file", file, file.name)
        body = form
      }
      const response = ensureOk(
        await transport({
          method: options.method ?? "POST",
          url,
          headers,
          body,
          signal,
          withCredentials: options.withCredentials,
          timeout: options.timeout,
          // Multipart bodies are slightly larger than the file; scale to size.
          onUploadProgress: (loaded, total) =>
            onProgress(total > 0 ? (loaded / total) * file.size : 0),
        })
      )
      return options.parseResponse
        ? options.parseResponse(response)
        : (parseBody(response.body) as TResult)
    },
  }
}
