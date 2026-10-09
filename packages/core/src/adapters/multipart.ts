import { createChunks, getPartSize } from "../chunk"
import { abortError } from "../errors"
import { type RetryOptions, resolveRetryOptions, withRetry } from "../retry"
import type { UploadAdapter, UploadItem } from "../types"
import type { MaybePromise } from "./shared"

export interface UploadedPart {
  partNumber: number
  etag: string
  size: number
}

/** What a multipart adapter persists to resume an interrupted upload. */
export interface MultipartResumeState<TSession> {
  session: TSession
  partSize: number
  fileSize: number
  parts: UploadedPart[]
}

export interface MultipartPartContext<TSession> {
  session: TSession
  item: UploadItem
  partNumber: number
  blob: Blob
  signal: AbortSignal
  /** Bytes of this part sent so far. */
  onProgress(loaded: number): void
}

export interface MultipartAdapterOptions<TSession, TResult> {
  name?: string
  /** Preferred part size in bytes, or a function of the file size. Default 8 MiB. */
  partSize?: number | ((fileSize: number) => number)
  /** Smallest allowed part (except the last). Default 5 MiB (S3 limit). */
  minPartSize?: number
  /** Most parts allowed. Default 10 000 (S3 limit). */
  maxParts?: number
  /** Parts uploaded in parallel per file. Default `4`. */
  concurrency?: number
  /** Retry policy for each part. Default 3 retries starting at 500 ms. */
  retry?: RetryOptions | false
  /** Starts a multipart session (e.g. S3 CreateMultipartUpload). */
  create(context: {
    item: UploadItem
    file: File
    signal: AbortSignal
  }): MaybePromise<TSession>
  /** Uploads one part and returns its ETag (or any part identifier). */
  uploadPart(
    context: MultipartPartContext<TSession>
  ): MaybePromise<{ etag: string }>
  /** Finishes the session (e.g. S3 CompleteMultipartUpload). */
  complete(context: {
    session: TSession
    parts: UploadedPart[]
    item: UploadItem
    file: File
    signal: AbortSignal
  }): MaybePromise<TResult>
  /** Discards the session and its parts. */
  abort?(context: { session: TSession }): MaybePromise<void>
  /**
   * Lists parts the server already has. When provided, resumed uploads trust
   * the server instead of local state. Return `null` to keep local state.
   */
  listParts?(context: {
    session: TSession
    signal: AbortSignal
  }): MaybePromise<UploadedPart[] | null>
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals)
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    })
  }
  return controller.signal
}

function isResumeState<TSession>(
  value: unknown
): value is MultipartResumeState<TSession> {
  return (
    !!value &&
    typeof value === "object" &&
    "session" in value &&
    "partSize" in value &&
    "fileSize" in value &&
    Array.isArray((value as { parts?: unknown }).parts)
  )
}

/**
 * A provider-agnostic multipart/chunked upload engine. It splits files into
 * parts, uploads them in parallel, retries failed parts, reports aggregate
 * progress, and persists finished parts so uploads resume after a pause,
 * network loss or page reload.
 *
 * Bring three functions — `create`, `uploadPart`, `complete` — and it works
 * with S3, R2, GCS XML API, Azure block blobs, or your own chunk endpoint.
 */
export function multipartAdapter<TSession, TResult>(
  options: MultipartAdapterOptions<TSession, TResult>
): UploadAdapter<TResult> {
  const retry = resolveRetryOptions(
    options.retry === undefined ? { retries: 3, baseDelay: 500 } : options.retry
  )

  function resolvePartSize(fileSize: number) {
    const preferred =
      typeof options.partSize === "function"
        ? options.partSize(fileSize)
        : options.partSize
    return getPartSize(fileSize, preferred, {
      minPartSize: options.minPartSize,
      maxParts: options.maxParts,
    })
  }

  return {
    name: options.name ?? "multipart",
    resumable: true,

    async upload(context) {
      const { item, file, signal } = context
      const partSize = resolvePartSize(file.size)

      let state: MultipartResumeState<TSession> | null =
        isResumeState<TSession>(context.resumeState) &&
        context.resumeState.fileSize === file.size
          ? context.resumeState
          : null

      if (state && options.listParts) {
        const serverParts = await options.listParts({
          session: state.session,
          signal,
        })
        if (serverParts) state = { ...state, parts: serverParts }
      }
      if (!state) {
        const session = await options.create({ item, file, signal })
        state = { session, partSize, fileSize: file.size, parts: [] }
        context.saveResumeState(state)
      }

      const session = state.session
      const chunks = createChunks(file.size, state.partSize)
      const done = new Map<number, UploadedPart>()
      for (const part of state.parts) {
        const chunk = chunks[part.partNumber - 1]
        // Ignore parts that don't line up with the current chunking.
        if (chunk && chunk.size === part.size) done.set(part.partNumber, part)
      }
      const inflight = new Map<number, number>()
      const pending = chunks.filter((chunk) => !done.has(chunk.partNumber))
      const resumeBase = state

      const report = () => {
        let loaded = 0
        for (const part of done.values()) loaded += part.size
        for (const bytes of inflight.values()) loaded += bytes
        context.onProgress(loaded, file.size)
      }
      const save = () => {
        context.saveResumeState({
          ...resumeBase,
          parts: [...done.values()].sort((a, b) => a.partNumber - b.partNumber),
        })
      }

      context.onChunkProgress(done.size, chunks.length)
      report()

      // A permanently failed part cancels its siblings.
      const failure = new AbortController()
      const partSignal = anySignal([signal, failure.signal])
      let cursor = 0

      const worker = async () => {
        while (cursor < pending.length) {
          if (partSignal.aborted) throw abortError(partSignal.reason)
          const chunk = pending[cursor++]!
          const blob = file.slice(chunk.start, chunk.end)
          const { etag } = await withRetry(
            async () => {
              inflight.set(chunk.partNumber, 0)
              return options.uploadPart({
                session,
                item,
                partNumber: chunk.partNumber,
                blob,
                signal: partSignal,
                onProgress(loaded) {
                  inflight.set(chunk.partNumber, Math.min(loaded, chunk.size))
                  report()
                },
              })
            },
            retry,
            partSignal
          )
          inflight.delete(chunk.partNumber)
          done.set(chunk.partNumber, {
            partNumber: chunk.partNumber,
            etag,
            size: chunk.size,
          })
          save()
          context.onChunkProgress(done.size, chunks.length)
          report()
        }
      }

      const limit = Math.max(1, options.concurrency ?? 4)
      try {
        await Promise.all(
          Array.from({ length: Math.min(limit, pending.length) }, worker)
        )
      } catch (error) {
        failure.abort(error)
        throw error
      }

      const parts = [...done.values()].sort(
        (a, b) => a.partNumber - b.partNumber
      )
      return options.complete({ session, parts, item, file, signal })
    },

    async abort({ resumeState }) {
      if (options.abort && isResumeState<TSession>(resumeState)) {
        await options.abort({ session: resumeState.session })
      }
    },
  }
}
