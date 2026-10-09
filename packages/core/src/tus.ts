/**
 * Resumable uploads over the tus protocol, powered by the reference client
 * `tus-js-client`. Install it alongside: `npm i tus-js-client`.
 */
import { Upload, type UploadOptions } from "tus-js-client"

import { UploadError, httpError } from "./errors"
import type { UploadAdapter } from "./types"

export interface TusAdapterOptions extends Pick<
  UploadOptions,
  | "endpoint"
  | "chunkSize"
  | "parallelUploads"
  | "retryDelays"
  | "removeFingerprintOnSuccess"
> {
  endpoint: string
  /** Static headers, or a function evaluated per upload (e.g. fresh tokens). */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
  /** Extra tus metadata. `filename` and `filetype` are always sent. */
  metadata?: Record<string, string>
}

export interface TusUploadResult {
  /** The tus upload URL, which identifies the stored file. */
  url: string
}

interface TusResumeState {
  uploadUrl: string
}

function toError(error: Error): UploadError {
  const response = (
    error as { originalResponse?: { getStatus(): number } | null }
  ).originalResponse
  if (response)
    return httpError(response.getStatus(), { message: error.message })
  return new UploadError(error.message || "tus upload failed", {
    code: "network",
    retryable: true,
    cause: error,
  })
}

/**
 * Uploads with the tus resumable protocol. Resume state (the upload URL) is
 * kept by the engine, so it works with `createIndexedDBPersistence` across
 * reloads. Retries are handled by the engine; set `retryDelays` to let
 * tus-js-client retry chunks internally as well.
 */
export function tusAdapter(
  options: TusAdapterOptions
): UploadAdapter<TusUploadResult> {
  return {
    name: "tus",
    resumable: true,
    async upload({
      item,
      file,
      signal,
      resumeState,
      onProgress,
      saveResumeState,
    }) {
      const headers =
        typeof options.headers === "function"
          ? await options.headers()
          : options.headers
      const previous = resumeState as TusResumeState | null

      return new Promise<TusUploadResult>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: options.endpoint,
          uploadUrl: previous?.uploadUrl ?? null,
          chunkSize: options.chunkSize,
          parallelUploads: options.parallelUploads,
          retryDelays: options.retryDelays ?? [],
          removeFingerprintOnSuccess: options.removeFingerprintOnSuccess,
          // The engine owns resume state, not tus-js-client's localStorage.
          storeFingerprintForResuming: false,
          headers,
          metadata: {
            filename: file.name,
            filetype: file.type,
            uploadId: item.id,
            ...options.metadata,
          },
          onUploadUrlAvailable() {
            if (upload.url)
              saveResumeState({
                uploadUrl: upload.url,
              } satisfies TusResumeState)
          },
          onProgress(bytesSent, bytesTotal) {
            onProgress(bytesSent, bytesTotal)
          },
          onSuccess() {
            signal.removeEventListener("abort", onAbort)
            resolve({ url: upload.url ?? "" })
          },
          onError(error) {
            signal.removeEventListener("abort", onAbort)
            reject(toError(error))
          },
        })
        function onAbort() {
          void upload.abort(false)
          reject(new UploadError("Upload aborted", { code: "aborted" }))
        }
        if (signal.aborted) {
          onAbort()
          return
        }
        signal.addEventListener("abort", onAbort, { once: true })
        upload.start()
      })
    },
    async abort({ resumeState }) {
      const state = resumeState as TusResumeState | null
      if (!state?.uploadUrl) return
      // Termination extension: ask the server to delete the partial upload.
      await Upload.terminate(state.uploadUrl, {}).catch(() => {})
    },
  }
}
