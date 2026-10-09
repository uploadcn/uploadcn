import { describe, expect, it } from "vitest"

import {
  UploadError,
  httpError,
  isRetryableStatus,
  parseRetryAfter,
  toUploadError,
} from "../src/errors"
import { getRetryDelay, resolveRetryOptions, withRetry } from "../src/retry"
import { SpeedTracker, estimateEta } from "../src/speed"
import { getUploadSummary } from "../src/summary"
import type { UploadItem } from "../src/types"
import { formatBytes, formatDuration } from "../src/utils"

describe("errors", () => {
  it("classifies HTTP statuses", () => {
    expect([408, 425, 429, 500, 503].every(isRetryableStatus)).toBe(true)
    expect([400, 401, 403, 404, 413].some(isRetryableStatus)).toBe(false)
    expect(httpError(500).retryable).toBe(true)
  })

  it("parses Retry-After seconds and dates", () => {
    expect(parseRetryAfter("2")).toBe(2000)
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6000)
    expect(parseRetryAfter("soon")).toBeUndefined()
  })

  it("normalizes thrown values", () => {
    expect(toUploadError(new TypeError("Failed to fetch"))).toMatchObject({
      code: "network",
      retryable: true,
    })
    const abort = Object.assign(new Error("x"), { name: "AbortError" })
    expect(toUploadError(abort).code).toBe("aborted")
    expect(toUploadError("weird").code).toBe("unknown")
  })
})

describe("retry", () => {
  it("grows exponentially and caps the delay", () => {
    const options = resolveRetryOptions({
      baseDelay: 100,
      maxDelay: 500,
      jitter: false,
    })
    expect([1, 2, 3, 4].map((n) => getRetryDelay(n, options))).toEqual([
      100, 200, 400, 500,
    ])
  })

  it("applies equal jitter between half and the full delay", () => {
    const options = resolveRetryOptions({ baseDelay: 1000 })
    expect(getRetryDelay(1, options, () => 0)).toBe(500)
    expect(getRetryDelay(1, options, () => 1)).toBe(1000)
  })

  it("disables retries with false", () => {
    expect(resolveRetryOptions(false).retries).toBe(0)
  })

  it("withRetry retries retryable errors only", async () => {
    let calls = 0
    const options = resolveRetryOptions({
      retries: 3,
      baseDelay: 1,
      jitter: false,
    })
    const value = await withRetry(async () => {
      calls++
      if (calls < 3)
        throw new UploadError("flaky", { code: "network", retryable: true })
      return "ok"
    }, options)
    expect(value).toBe("ok")
    expect(calls).toBe(3)

    calls = 0
    await expect(
      withRetry(async () => {
        calls++
        throw new UploadError("nope", { code: "http", status: 400 })
      }, options)
    ).rejects.toThrow("nope")
    expect(calls).toBe(1)
  })
})

describe("speed and eta", () => {
  it("measures throughput over a window and estimates time left", () => {
    const tracker = new SpeedTracker()
    expect(tracker.sample(0, 0)).toBeNull()
    expect(tracker.sample(500, 500)).toBe(1000)
    expect(estimateEta(500, 1500, 1000)).toBe(1)
    expect(estimateEta(500, 1500, null)).toBeNull()
  })

  it("resets when progress goes backwards", () => {
    const tracker = new SpeedTracker()
    tracker.sample(0, 0)
    tracker.sample(1000, 1000)
    expect(tracker.sample(0, 1100)).toBeNull()
  })
})

describe("formatting", () => {
  it("formats bytes and durations", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(1500)).toBe("1.5 KB")
    expect(formatBytes(250_000_000)).toBe("250 MB")
    expect(formatDuration(45)).toBe("45s")
    expect(formatDuration(200)).toBe("3m 20s")
    expect(formatDuration(3900)).toBe("1h 5m")
    expect(formatDuration(null)).toBe("")
  })
})

describe("getUploadSummary", () => {
  const item = (
    status: UploadItem["status"],
    size: number,
    loaded = 0,
    speed: number | null = null
  ) => ({ status, size, progress: { loaded, speed } }) as UploadItem

  it("aggregates progress, speed and counts", () => {
    const summary = getUploadSummary([
      item("success", 100),
      item("uploading", 100, 50, 10),
      item("rejected", 1000),
      item("error", 100),
    ])
    expect(summary.total).toBe(3)
    expect(summary.size).toBe(300)
    expect(summary.loaded).toBe(150)
    expect(summary.percent).toBe(50)
    expect(summary.speed).toBe(10)
    expect(summary.eta).toBe(15)
    expect(summary.isUploading).toBe(true)
    expect(summary.hasErrors).toBe(true)
    expect(summary.isComplete).toBe(false)
  })
})
