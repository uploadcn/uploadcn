import { afterEach, describe, expect, it, vi } from "vitest"

import { UploadError } from "../src/errors"
import { createMemoryPersistence } from "../src/persistence"
import type { UploadStatus, UploaderOptions } from "../src/types"
import { createUploader } from "../src/uploader"
import { controlledAdapter, createFile, fakeNetwork, tick } from "./helpers"

const uploaders: { destroy(): void }[] = []

function setup(
  options: Partial<UploaderOptions> = {},
  adapterOptions: { resumable?: boolean } = {}
) {
  const controlled = controlledAdapter(adapterOptions)
  const uploader = createUploader({
    adapter: controlled.adapter,
    network: false,
    progressInterval: 0,
    retry: { retries: 2, baseDelay: 5, jitter: false },
    ...options,
  })
  uploaders.push(uploader)
  const statuses = () => uploader.getState().items.map((item) => item.status)
  return { uploader, ...controlled, statuses }
}

afterEach(() => {
  for (const uploader of uploaders.splice(0)) uploader.destroy()
})

describe("createUploader", () => {
  it("uploads a file and stores the adapter result", async () => {
    const { uploader, last, statuses } = setup()
    const success = vi.fn()
    uploader.on("success", success)

    const [item] = await uploader.add([createFile("a.txt", 100)])
    expect(item!.status).toBe("uploading")

    last().context.onProgress(50)
    expect(uploader.getItem(item!.id)!.progress.percent).toBe(50)

    last().resolve({ url: "https://cdn/a.txt" })
    await vi.waitFor(() => expect(statuses()).toEqual(["success"]))
    expect(uploader.getItem(item!.id)!.result).toEqual({
      url: "https://cdn/a.txt",
    })
    expect(uploader.getItem(item!.id)!.progress.percent).toBe(100)
    expect(success).toHaveBeenCalledOnce()
  })

  it("never runs more uploads than the concurrency limit", async () => {
    const { uploader, active, calls, statuses } = setup({ concurrency: 2 })
    await uploader.add([
      createFile("a"),
      createFile("b"),
      createFile("c"),
      createFile("d"),
    ])
    expect(active()).toHaveLength(2)
    expect(statuses()).toEqual(["uploading", "uploading", "queued", "queued"])

    calls[0]!.resolve()
    await vi.waitFor(() => expect(calls).toHaveLength(3))
    expect(active()).toHaveLength(2)
    expect(statuses()[2]).toBe("uploading")
  })

  it("retries retryable errors with backoff, then succeeds", async () => {
    const { uploader, calls, statuses } = setup()
    const onRetry = vi.fn()
    uploader.on("retry", ({ item, delay }) =>
      onRetry(item.status, delay, item.retryAt)
    )
    await uploader.add([createFile()])

    calls[0]!.reject(
      new UploadError("503", { code: "http", status: 503, retryable: true })
    )
    await vi.waitFor(() => expect(onRetry).toHaveBeenCalled())
    expect(onRetry).toHaveBeenCalledWith("queued", 5, expect.any(Number))

    await vi.waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1]!.context.attempt).toBe(2)
    calls[1]!.resolve()
    await vi.waitFor(() => expect(statuses()).toEqual(["success"]))
  })

  it("gives up after the retry budget and reports the error", async () => {
    const { uploader, calls, statuses } = setup({
      retry: { retries: 1, baseDelay: 1, jitter: false },
    })
    const onError = vi.fn()
    uploader.on("error", onError)
    await uploader.add([createFile()])
    const failure = () =>
      new UploadError("down", { code: "network", retryable: true })

    calls[0]!.reject(failure())
    await vi.waitFor(() => expect(calls).toHaveLength(2))
    calls[1]!.reject(failure())
    await vi.waitFor(() => expect(statuses()).toEqual(["error"]))
    expect(onError).toHaveBeenCalledOnce()
    expect(uploader.getState().items[0]!.attempts).toBe(2)
  })

  it("does not retry non-retryable errors", async () => {
    const { uploader, calls, statuses } = setup()
    await uploader.add([createFile()])
    calls[0]!.reject(
      new UploadError("Forbidden", { code: "http", status: 403 })
    )
    await vi.waitFor(() => expect(statuses()).toEqual(["error"]))
    await tick()
    expect(calls).toHaveLength(1)
  })

  it("honors Retry-After when it is longer than the backoff", async () => {
    const { uploader, calls } = setup()
    const onRetry = vi.fn()
    uploader.on("retry", onRetry)
    await uploader.add([createFile()])
    calls[0]!.reject(
      new UploadError("429", {
        code: "http",
        status: 429,
        retryable: true,
        retryAfter: 40,
      })
    )
    await vi.waitFor(() => expect(onRetry).toHaveBeenCalled())
    expect(onRetry.mock.calls[0]![0].delay).toBe(40)
  })

  it("manual retry resets the attempt counter", async () => {
    const { uploader, calls, statuses } = setup({ retry: false })
    const [item] = await uploader.add([createFile()])
    calls[0]!.reject(
      new UploadError("x", { code: "http", status: 500, retryable: true })
    )
    await vi.waitFor(() => expect(statuses()).toEqual(["error"]))

    uploader.retry(item!.id)
    await vi.waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1]!.context.attempt).toBe(1)
  })

  it("cancels an upload, aborts the request and cleans up remote state", async () => {
    const { uploader, calls, aborted, statuses } = setup()
    const [item] = await uploader.add([createFile()])
    calls[0]!.context.saveResumeState({ uploadId: "abc" })

    uploader.cancel(item!.id)
    expect(calls[0]!.context.signal.aborted).toBe(true)
    expect(statuses()).toEqual(["cancelled"])
    expect(aborted).toEqual([{ uploadId: "abc" }])
    await tick()
    expect(statuses()).toEqual(["cancelled"])
  })

  it("removes an item mid-upload", async () => {
    const { uploader, calls } = setup()
    const [item] = await uploader.add([createFile()])
    uploader.remove(item!.id)
    expect(calls[0]!.context.signal.aborted).toBe(true)
    expect(uploader.getState().items).toHaveLength(0)
  })

  it("only pauses in-flight uploads when the adapter is resumable", async () => {
    const plain = setup()
    const [item] = await plain.uploader.add([createFile()])
    expect(plain.uploader.canPause(item!)).toBe(false)
    plain.uploader.pause(item!.id)
    expect(plain.statuses()).toEqual(["uploading"])
  })

  it("pauses and resumes from the saved resume state", async () => {
    const { uploader, calls, statuses } = setup({}, { resumable: true })
    const [item] = await uploader.add([createFile("big.bin", 1000)])
    calls[0]!.context.onProgress(400)
    calls[0]!.context.saveResumeState({ offset: 400 })

    uploader.pause(item!.id)
    expect(calls[0]!.context.signal.aborted).toBe(true)
    expect(statuses()).toEqual(["paused"])
    expect(uploader.getItem(item!.id)!.pauseReason).toBe("user")

    uploader.resume(item!.id)
    await vi.waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1]!.context.resumeState).toEqual({ offset: 400 })
    expect(uploader.getItem(item!.id)!.progress.loaded).toBe(400)
  })

  it("can pause queued items with any adapter", async () => {
    const { uploader, statuses } = setup({ concurrency: 1 })
    const [, second] = await uploader.add([createFile("a"), createFile("b")])
    uploader.pause(second!.id)
    expect(statuses()).toEqual(["uploading", "paused"])
  })

  it("waits for start() when autoUpload is off", async () => {
    const { uploader, calls, statuses } = setup({ autoUpload: false })
    await uploader.add([createFile("a"), createFile("b")])
    expect(statuses()).toEqual(["idle", "idle"])
    expect(calls).toHaveLength(0)
    uploader.start()
    expect(statuses()).toEqual(["uploading", "uploading"])
  })

  it("rejects duplicates and files over maxFiles", async () => {
    const { uploader, statuses } = setup({ maxFiles: 2 })
    const onReject = vi.fn()
    uploader.on("reject", onReject)
    const file = createFile("same.txt")
    await uploader.add([file])
    await uploader.add([file, createFile("b"), createFile("c")])

    expect(statuses()).toEqual([
      "uploading",
      "rejected",
      "uploading",
      "rejected",
    ])
    const issues = uploader.getState().items.map((item) => item.issues[0]?.code)
    expect(issues).toEqual([
      undefined,
      "duplicate",
      undefined,
      "too-many-files",
    ])
    expect(onReject).toHaveBeenCalledTimes(2)
  })

  it("replaces duplicates when asked to", async () => {
    const { uploader } = setup({ duplicates: "replace" })
    const file = createFile("same.txt")
    const [first] = await uploader.add([file])
    const [second] = await uploader.add([file])
    const ids = uploader.getState().items.map((item) => item.id)
    expect(ids).toEqual([second!.id])
    expect(ids).not.toContain(first!.id)
  })

  it("rejects files that fail validation with readable issues", async () => {
    const { uploader, calls } = setup({ accept: "image/*", maxSize: 10 })
    const [item] = await uploader.add([createFile("a.txt", 100)])
    expect(item!.status).toBe("rejected")
    expect(item!.error?.code).toBe("validation")
    expect(item!.issues.map((issue) => issue.code)).toEqual([
      "file-invalid-type",
      "file-too-large",
    ])
    expect(calls).toHaveLength(0)
  })

  it("applies transforms before uploading", async () => {
    const { uploader, last } = setup({
      transform: (file) =>
        new File(["smaller"], file.name, { type: file.type }),
    })
    const [item] = await uploader.add([createFile("a.txt", 5000)])
    expect(item!.size).toBe(7)
    expect(item!.originalFile.size).toBe(5000)
    expect(last().context.file.size).toBe(7)
  })

  it("runs server processing and scan states after the upload", async () => {
    let finishScan!: () => void
    const scanned = new Promise<void>((resolve) => (finishScan = resolve))
    const seen: UploadStatus[] = []
    const { uploader, last, statuses } = setup({
      async process(_item, { setStatus, result }) {
        setStatus("scanning")
        await scanned
        return { ...(result as object), clean: true }
      },
    })
    uploader.on("statuschange", ({ item }) => seen.push(item.status))
    await uploader.add([createFile()])
    last().resolve({ key: "k" })

    await vi.waitFor(() => expect(statuses()).toEqual(["scanning"]))
    finishScan()
    await vi.waitFor(() => expect(statuses()).toEqual(["success"]))
    expect(seen).toEqual([
      "queued",
      "uploading",
      "processing",
      "scanning",
      "success",
    ])
    expect(uploader.getState().items[0]!.result).toEqual({
      key: "k",
      clean: true,
    })
  })

  it("marks files rejected by the server", async () => {
    const { uploader, last, statuses } = setup({
      async process() {
        throw new UploadError("Malware detected", { code: "rejected" })
      },
    })
    await uploader.add([createFile()])
    last().resolve()
    await vi.waitFor(() => expect(statuses()).toEqual(["rejected"]))
    expect(uploader.getState().items[0]!.error?.message).toBe(
      "Malware detected"
    )
  })

  it("lets the application drive scan states with update()", async () => {
    const { uploader, last, statuses } = setup()
    const [item] = await uploader.add([createFile()])
    last().resolve()
    await vi.waitFor(() => expect(statuses()).toEqual(["success"]))
    uploader.update(item!.id, { status: "scanning" })
    expect(statuses()).toEqual(["scanning"])
    uploader.update(item!.id, { status: "rejected", error: "Infected" })
    expect(statuses()).toEqual(["rejected"])
    expect(uploader.getState().items[0]!.error?.code).toBe("rejected")
  })

  it("pauses on network loss without burning retries, then resumes", async () => {
    const network = fakeNetwork()
    const { uploader, calls, statuses } = setup({ network: network.monitor })
    const unmount = uploader.mount()
    await uploader.add([createFile()])

    network.set(false)
    calls[0]!.reject(
      new UploadError("offline", { code: "network", retryable: true })
    )
    await vi.waitFor(() => expect(statuses()).toEqual(["paused"]))
    expect(uploader.getState().items[0]!.pauseReason).toBe("offline")
    expect(uploader.getState().online).toBe(false)

    await uploader.add([createFile("queued-while-offline")])
    expect(statuses()).toEqual(["paused", "queued"])

    network.set(true)
    await vi.waitFor(() => expect(calls).toHaveLength(3))
    expect(calls[1]!.context.attempt).toBe(1)
    unmount()
  })

  it("emits complete once the queue drains", async () => {
    const { uploader, calls } = setup()
    const onComplete = vi.fn()
    uploader.on("complete", onComplete)
    await uploader.add([createFile("a"), createFile("b")])
    calls[0]!.resolve()
    await tick()
    expect(onComplete).not.toHaveBeenCalled()
    calls[1]!.resolve()
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
  })

  it("notifies subscribers with immutable snapshots", async () => {
    const { uploader, last } = setup()
    const snapshots: unknown[] = []
    uploader.subscribe(() => snapshots.push(uploader.getState()))
    await uploader.add([createFile()])
    const before = uploader.getState()
    last().context.onProgress(10)
    const after = uploader.getState()
    expect(after).not.toBe(before)
    expect(after.items[0]).not.toBe(before.items[0])
    expect(new Set(snapshots).size).toBe(snapshots.length)
  })

  it("requeues in-flight work on unmount and resumes on remount", async () => {
    const { uploader, calls, statuses } = setup()
    const unmount = uploader.mount()
    await uploader.add([createFile()])
    unmount()
    expect(calls[0]!.context.signal.aborted).toBe(true)
    expect(statuses()).toEqual(["queued"])
    const remount = uploader.mount()
    expect(calls).toHaveLength(2)
    remount()
  })
})

describe("persistence", () => {
  it("persists queued uploads and restores them as paused", async () => {
    const persistence = createMemoryPersistence()
    const first = setup({ persistence }, { resumable: true })
    const [item] = await first.uploader.add([createFile("video.mp4", 1000)])
    first.last().context.onProgress(600)
    first.last().context.saveResumeState({ offset: 600 })
    first.uploader.pause(item!.id)
    await vi.waitFor(() =>
      expect(persistence.records.get(item!.id)?.resumeState).toEqual({
        offset: 600,
      })
    )
    first.uploader.destroy()

    const second = setup({ persistence }, { resumable: true })
    const [restored] = await second.uploader.restore()
    expect(restored).toMatchObject({
      id: item!.id,
      status: "paused",
      pauseReason: "restored",
      restored: true,
      resumeState: { offset: 600 },
    })
    expect(restored!.progress.loaded).toBe(600)

    second.uploader.resume()
    await vi.waitFor(() => expect(second.calls).toHaveLength(1))
    second.last().resolve()
    await vi.waitFor(() => expect(persistence.records.size).toBe(0))
  })

  it("drops resume state saved by a different adapter", async () => {
    const persistence = createMemoryPersistence()
    await persistence.save({
      id: "1",
      batchId: "b",
      file: createFile(),
      originalFile: createFile(),
      meta: {},
      resumeState: { foreign: true },
      adapter: "something-else",
      createdAt: 1,
    })
    const { uploader } = setup({ persistence })
    const [item] = await uploader.restore()
    expect(item!.resumeState).toBeNull()
  })
})
