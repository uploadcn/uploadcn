import { UploadError } from "../errors"
import { sleep } from "../retry"
import type { UploadAdapter, UploadAdapterContext, UploadItem } from "../types"
import { createId } from "../utils"

export interface MockUploadResult {
  key: string
  url: string
}

export interface MockAdapterOptions<TResult> {
  /** Simulated throughput in bytes/second. Default 4 MB/s. */
  speed?: number
  /** Delay before the first byte, in ms. Default 250. */
  latency?: number
  /** Probability (0–1) that an attempt fails midway. Default 0. */
  failureRate?: number
  /**
   * Decide per attempt whether to fail. Return an `UploadError` to fail
   * around halfway through, or nothing to succeed.
   */
  fail?: (context: UploadAdapterContext) => UploadError | null | undefined
  /** Simulate chunked progress with this chunk size (enables chunk counts). */
  chunkSize?: number
  /** Whether pause/resume continues from the last byte. Default `true`. */
  resumable?: boolean
  result?: (item: UploadItem) => TResult
}

interface MockResumeState {
  loaded: number
}

/**
 * An in-memory adapter that simulates real network behavior — throughput,
 * latency, failures, chunks and resume — without a backend. Use it for
 * prototypes, tests, Storybook and documentation.
 */
export function mockAdapter<TResult = MockUploadResult>(
  options: MockAdapterOptions<TResult> = {}
): UploadAdapter<TResult> {
  const speed = options.speed ?? 4_000_000
  const tick = 50
  const resumable = options.resumable ?? true

  return {
    name: "mock",
    resumable,
    async upload(context) {
      const { file, signal, item } = context
      const saved = context.resumeState as MockResumeState | null
      let loaded = resumable && saved ? saved.loaded : 0
      const chunkSize = options.chunkSize
      const totalChunks = chunkSize
        ? Math.max(1, Math.ceil(file.size / chunkSize))
        : 0

      const injected =
        options.fail?.(context) ??
        (Math.random() < (options.failureRate ?? 0)
          ? new UploadError("Simulated network failure", {
              code: "network",
              retryable: true,
            })
          : null)
      const failAt = injected
        ? loaded + (file.size - loaded) * (0.3 + Math.random() * 0.4)
        : Infinity

      await sleep(options.latency ?? 250, signal)
      context.onProgress(loaded, file.size)

      while (loaded < file.size) {
        await sleep(tick, signal)
        loaded = Math.min(file.size, loaded + (speed * tick) / 1000)
        if (loaded >= failAt && injected) throw injected
        context.onProgress(loaded, file.size)
        if (chunkSize) {
          context.onChunkProgress(Math.floor(loaded / chunkSize), totalChunks)
        }
        if (resumable)
          context.saveResumeState({ loaded } satisfies MockResumeState)
      }

      if (options.result) return options.result(item)
      const key = `${createId()}/${file.name}`
      const result: MockUploadResult = {
        key,
        url: `mock://uploads/${encodeURIComponent(key)}`,
      }
      return result as TResult
    },
  }
}
