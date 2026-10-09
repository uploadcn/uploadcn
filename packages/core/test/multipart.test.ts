import { describe, expect, it, vi } from "vitest"

import { multipartAdapter, type UploadedPart } from "../src/adapters/multipart"
import { MiB, createChunks, getPartSize } from "../src/chunk"
import { UploadError } from "../src/errors"
import type { UploadAdapterContext, UploadItem } from "../src/types"
import { createFile } from "./helpers"

describe("chunking", () => {
  it("splits files into 1-based parts with a smaller last part", () => {
    expect(createChunks(25, 10)).toEqual([
      { partNumber: 1, start: 0, end: 10, size: 10 },
      { partNumber: 2, start: 10, end: 20, size: 10 },
      { partNumber: 3, start: 20, end: 25, size: 5 },
    ])
  })

  it("always produces at least one part, even for empty files", () => {
    expect(createChunks(0, 10)).toEqual([
      { partNumber: 1, start: 0, end: 0, size: 0 },
    ])
  })

  it("respects S3 part limits", () => {
    expect(getPartSize(10 * MiB, 1 * MiB)).toBe(5 * MiB)
    expect(getPartSize(100 * MiB)).toBe(8 * MiB)
    const huge = 200_000 * MiB
    expect(getPartSize(huge) * 10_000).toBeGreaterThanOrEqual(huge)
  })
})

function context(
  file: File,
  overrides: Partial<UploadAdapterContext> = {}
): UploadAdapterContext & { saved: unknown[]; progress: number[] } {
  const saved: unknown[] = []
  const progress: number[] = []
  return {
    item: { id: "1", meta: {} } as UploadItem,
    file,
    signal: new AbortController().signal,
    attempt: 1,
    resumeState: null,
    onProgress: (loaded) => progress.push(loaded),
    onChunkProgress: () => {},
    saveResumeState: (state) => saved.push(state),
    saved,
    progress,
    ...overrides,
  }
}

function setup(
  options: { failPart?: number; failures?: number; concurrency?: number } = {}
) {
  let failures = options.failures ?? 0
  let active = 0
  let maxActive = 0
  const uploaded: number[] = []
  const adapter = multipartAdapter({
    partSize: 10,
    minPartSize: 1,
    concurrency: options.concurrency ?? 2,
    retry: { retries: 2, baseDelay: 1, jitter: false },
    create: vi.fn(async () => ({ uploadId: "u1" })),
    async uploadPart({ partNumber, blob, onProgress }) {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 2))
      active--
      if (partNumber === options.failPart && failures-- > 0) {
        throw new UploadError("reset", { code: "network", retryable: true })
      }
      onProgress(blob.size)
      uploaded.push(partNumber)
      return { etag: `"etag-${partNumber}"` }
    },
    complete: vi.fn(async ({ parts }) => ({ parts })),
    abort: vi.fn(async () => {}),
  })
  return { adapter, uploaded, maxActive: () => maxActive }
}

describe("multipartAdapter", () => {
  it("uploads every part with bounded parallelism and completes in order", async () => {
    const { adapter, uploaded, maxActive } = setup({ concurrency: 2 })
    const ctx = context(createFile("a.bin", 45))
    const result = (await adapter.upload(ctx)) as { parts: UploadedPart[] }

    expect(uploaded.sort()).toEqual([1, 2, 3, 4, 5])
    expect(maxActive()).toBe(2)
    expect(result.parts.map((part) => part.partNumber)).toEqual([1, 2, 3, 4, 5])
    expect(result.parts[4]).toEqual({
      partNumber: 5,
      etag: '"etag-5"',
      size: 5,
    })
    expect(ctx.progress.at(-1)).toBe(45)
  })

  it("retries a failed part without restarting the others", async () => {
    const { adapter, uploaded } = setup({ failPart: 2, failures: 2 })
    await adapter.upload(context(createFile("a.bin", 30)))
    expect(uploaded.filter((part) => part === 2)).toHaveLength(1)
    expect(uploaded).toHaveLength(3)
  })

  it("fails once a part exhausts its retries", async () => {
    const { adapter } = setup({ failPart: 1, failures: 5 })
    await expect(
      adapter.upload(context(createFile("a.bin", 30)))
    ).rejects.toMatchObject({
      code: "network",
    })
  })

  it("persists finished parts and resumes without re-uploading them", async () => {
    const first = setup()
    const ctx = context(createFile("a.bin", 30))
    await first.adapter.upload(ctx)
    const afterTwoParts = (ctx.saved as { parts: UploadedPart[] }[]).find(
      (state) => state.parts.length === 2
    )!

    const second = setup()
    const resumed = context(createFile("a.bin", 30), {
      resumeState: afterTwoParts,
    })
    await second.adapter.upload(resumed)
    expect(second.uploaded).toHaveLength(1)
    // Progress starts from the bytes already stored.
    expect(resumed.progress[0]).toBe(20)
  })

  it("starts over when the resume state belongs to another file", async () => {
    const { adapter, uploaded } = setup()
    const stale = {
      session: { uploadId: "old" },
      partSize: 10,
      fileSize: 999,
      parts: [],
    }
    await adapter.upload(
      context(createFile("a.bin", 20), { resumeState: stale })
    )
    expect(uploaded).toHaveLength(2)
  })

  it("aborts the remote session", async () => {
    const abort = vi.fn(async () => {})
    const adapter = multipartAdapter({
      create: async () => ({ id: 1 }),
      uploadPart: async () => ({ etag: "x" }),
      complete: async () => null,
      abort,
    })
    await adapter.abort?.({
      item: {} as UploadItem,
      resumeState: { session: { id: 1 }, partSize: 1, fileSize: 1, parts: [] },
    })
    expect(abort).toHaveBeenCalledWith({ session: { id: 1 } })
  })

  it("stops when the signal aborts", async () => {
    const controller = new AbortController()
    const adapter = multipartAdapter({
      partSize: 10,
      minPartSize: 1,
      create: async () => ({}),
      async uploadPart({ signal }) {
        controller.abort()
        if (signal.aborted)
          throw Object.assign(new Error("aborted"), { name: "AbortError" })
        return { etag: "x" }
      },
      complete: async () => null,
    })
    await expect(
      adapter.upload(
        context(createFile("a.bin", 30), { signal: controller.signal })
      )
    ).rejects.toMatchObject({ code: "aborted" })
  })
})
