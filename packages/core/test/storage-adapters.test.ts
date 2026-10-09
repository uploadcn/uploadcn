import "fake-indexeddb/auto"

import { describe, expect, it } from "vitest"

import { cloudinaryAdapter } from "../src/adapters/cloudinary"
import { createAdapter } from "../src/adapters/custom"
import {
  deleteLocalFile,
  getLocalFile,
  localAdapter,
} from "../src/adapters/local"
import { createUploader } from "../src/uploader"
import type { UploadAdapterContext, UploadItem } from "../src/types"
import { createFile, fakeTransport } from "./helpers"

function context(file: File, overrides: Partial<UploadAdapterContext> = {}) {
  const progress: number[] = []
  const saved: unknown[] = []
  const ctx: UploadAdapterContext = {
    item: { id: "item-1", meta: {}, file } as unknown as UploadItem,
    file,
    signal: new AbortController().signal,
    attempt: 1,
    resumeState: null,
    onProgress: (loaded) => progress.push(loaded),
    onChunkProgress: () => {},
    saveResumeState: (state) => saved.push(state),
    ...overrides,
  }
  return { ctx, progress, saved }
}

describe("createAdapter", () => {
  it("wraps an upload function and runs it through the engine", async () => {
    const adapter = createAdapter(async ({ file, onProgress }) => {
      onProgress(file.size)
      return { url: `https://cdn.test/${file.name}` }
    })
    const uploader = createUploader({ adapter })
    const complete = new Promise((resolve) => uploader.on("complete", resolve))
    const [item] = await uploader.add([createFile("a.txt")])
    await complete
    expect(uploader.getItem(item!.id)?.result).toEqual({
      url: "https://cdn.test/a.txt",
    })
    expect(adapter.name).toBe("custom")
  })
})

describe("cloudinaryAdapter", () => {
  it("requires an upload preset or a signer", () => {
    expect(() => cloudinaryAdapter({ cloudName: "demo" })).toThrow(
      /uploadPreset/
    )
  })

  it("uploads small files in one unsigned request", async () => {
    const { transport, requests } = fakeTransport(() => ({
      status: 200,
      body: JSON.stringify({ public_id: "x", secure_url: "https://res/x" }),
    }))
    const adapter = cloudinaryAdapter({
      cloudName: "demo",
      uploadPreset: "unsigned",
      folder: "avatars",
      transport,
    })
    const { ctx } = context(createFile("a.png", 1000, "image/png"))
    const result = await adapter.upload(ctx)
    expect(result.public_id).toBe("x")
    expect(requests[0]!.url).toBe(
      "https://api.cloudinary.com/v1_1/demo/auto/upload"
    )
    const body = requests[0]!.body as FormData
    expect(body.get("upload_preset")).toBe("unsigned")
    expect(body.get("folder")).toBe("avatars")
    expect(body.get("file")).toBeInstanceOf(Blob)
  })

  it("signs once and uploads large files in resumable chunks", async () => {
    const { transport, requests } = fakeTransport((request) => {
      const range = request.headers?.["content-range"] ?? ""
      const done = range.endsWith(`-${12_000_000 - 1}/12000000`)
      return {
        status: 200,
        body: JSON.stringify(
          done
            ? { public_id: "big", secure_url: "https://res/big" }
            : { done: false }
        ),
      }
    })
    let signed = 0
    const adapter = cloudinaryAdapter({
      cloudName: "demo",
      chunkSize: 5_000_000,
      sign: (params) => {
        signed++
        expect(params).toEqual({})
        return { signature: "sig", timestamp: 1, apiKey: "key" }
      },
      transport,
    })
    const file = createFile("video.mp4", 12_000_000, "video/mp4")
    const { ctx, saved } = context(file)
    const result = await adapter.upload(ctx)
    expect(result.public_id).toBe("big")
    expect(signed).toBe(1)
    expect(requests.map((r) => r.headers?.["content-range"])).toEqual([
      "bytes 0-4999999/12000000",
      "bytes 5000000-9999999/12000000",
      "bytes 10000000-11999999/12000000",
    ])
    const ids = new Set(requests.map((r) => r.headers?.["x-unique-upload-id"]))
    expect(ids.size).toBe(1)
    expect((requests[0]!.body as FormData).get("signature")).toBe("sig")
    expect(saved.at(-1)).toMatchObject({ offset: 12_000_000 })

    // Resuming skips the chunks already sent.
    requests.length = 0
    const resumed = context(file, {
      resumeState: { ...(saved[0] as object) },
    })
    await adapter.upload(resumed.ctx)
    expect(requests.map((r) => r.headers?.["content-range"])).toEqual([
      "bytes 5000000-9999999/12000000",
      "bytes 10000000-11999999/12000000",
    ])
  })
})

describe("localAdapter", () => {
  it("completes without a network and returns the file", async () => {
    const file = createFile("draft.txt", 10)
    const { ctx, progress } = context(file)
    const result = await localAdapter().upload(ctx)
    expect(result.file).toBe(file)
    expect(result.url).toMatch(/^blob:/)
    expect(progress.at(-1)).toBe(10)
  })

  it("persists files in IndexedDB when asked", async () => {
    const file = createFile("offline.txt", 20)
    const { ctx } = context(file)
    await localAdapter({ store: "indexeddb", dbName: "test-files" }).upload(ctx)
    const stored = await getLocalFile("item-1", { dbName: "test-files" })
    expect(stored?.size).toBe(20)
    await deleteLocalFile("item-1", { dbName: "test-files" })
    expect(await getLocalFile("item-1", { dbName: "test-files" })).toBeNull()
  })
})
