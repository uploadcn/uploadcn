import { abortError, toUploadError } from "./errors"

export interface RetryOptions {
  /** Number of automatic retries after the first attempt. Default `3`. */
  retries?: number
  /** Delay before the first retry, in ms. Default `1000`. */
  baseDelay?: number
  /** Upper bound for a single delay, in ms. Default `30000`. */
  maxDelay?: number
  /** Exponential growth factor. Default `2`. */
  factor?: number
  /** Randomize delays to avoid thundering herds. Default `true`. */
  jitter?: boolean
}

export const DEFAULT_RETRY: Required<RetryOptions> = {
  retries: 3,
  baseDelay: 1000,
  maxDelay: 30_000,
  factor: 2,
  jitter: true,
}

export function resolveRetryOptions(
  options: RetryOptions | false | undefined
): Required<RetryOptions> {
  if (options === false) return { ...DEFAULT_RETRY, retries: 0 }
  return { ...DEFAULT_RETRY, ...options }
}

/**
 * Exponential backoff with "equal jitter": half the delay is fixed, half is
 * random. `attempt` is the 1-based number of the retry being scheduled.
 */
export function getRetryDelay(
  attempt: number,
  options: Required<RetryOptions>,
  random: () => number = Math.random
): number {
  const exponential = options.baseDelay * options.factor ** (attempt - 1)
  const capped = Math.min(options.maxDelay, exponential)
  if (!options.jitter) return capped
  return Math.round(capped / 2 + (random() * capped) / 2)
}

/** Resolves after `ms`, or rejects with an abort error when `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal.reason))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(abortError(signal?.reason))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

/**
 * Runs `fn` until it succeeds, retrying retryable `UploadError`s with
 * exponential backoff. Used for individual chunks inside multipart uploads.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: Required<RetryOptions>,
  signal?: AbortSignal
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt)
    } catch (thrown) {
      const error = toUploadError(thrown)
      if (signal?.aborted || !error.retryable || attempt > options.retries) {
        throw error
      }
      await sleep(
        Math.max(error.retryAfter ?? 0, getRetryDelay(attempt, options)),
        signal
      )
    }
  }
}
