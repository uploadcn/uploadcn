import { describe, expect, it, vi } from "vitest"

import { httpAdapter } from "../src/adapters/http"
import { mockAdapter } from "../src/adapters/mock"
import { presignedAdapter } from "../src/adapters/presigned"
import { routeAdapter } from "../src/adapters/route"
import { s3Adapter } from "../src/adapters/s3"
import { MiB } from "../src/chunk"
import type { UploadRouteRequest } from "../src/protocol"
import type { UploadAdapterContext, UploadItem } from "../src/types"
import { createFile, fakeTransport } from "./helpers"

function context(file: File, overrides: Partial<UploadAdapterContext> = {}) {
  const progress: number[] = []
  const ctx: UploadAdapterContext = {
    item: {
      id: "item-1",
      meta: { folder: "avatars" },
      file,
    } as unknown as UploadItem,
    file,
    signal: new AbortController().signal,
    attempt: 1,
    resumeState: null,
    onProgress: (loaded) => progress.push(loaded),
    onChunkProgress: () => {},
    saveResumeState: () => {},
    ...overrides,
  }
  return { ctx, progress }
}

describe("httpAdapter", () => {
  it("posts multipart form data with extra fields and parses JSON", async () => {
    const { transport, requests } = fakeTransport(() => ({
      status: 200,
      body: JSON.stringify({ id: 42 }),
    }))
    const adapter = httpAdapter<{ id: number }>({
      url: "/upload",
      fields: { album: "summer" },
      headers: async () => ({ authorization: "Bearer t" }),
      transport,
    })
    const { ctx, progress } = context(createFile("a.txt", 50))
    await expect(adapter.upload(ctx)).resolves.toEqual({ id: 42 })

    const [request] = requests
    expect(request!.method).toBe("POST")
    expect(request!.headers).toEqual({ authorization: "Bearer t" })
    const form = request!.body as FormData
    expect(form.get("album")).toBe("summer")
    expect((form.get("file") as File).name).toBe("a.txt")
    // Progress is scaled from the multipart body size to the file size.
    expect(progress.at(-1)).toBe(50)
  })

  it("sends raw bodies with the file's content type", async () => {
    const { transport, requests } = fakeTransport(() => ({ status: 201 }))
    const adapter = httpAdapter({
      url: "/raw",
      method: "PUT",
      body: "binary",
      transport,
    })
    await adapter.upload(context(createFile("a.png", 5, "image/png")).ctx)
    expect(requests[0]!.headers).toEqual({ "content-type": "image/png" })
    expect(requests[0]!.body).toBeInstanceOf(File)
  })

  it("maps server errors to retryable and client errors to permanent failures", async () => {
    const failing = (status: number) =>
      httpAdapter({
        url: "/u",
        transport: fakeTransport(() => ({ status })).transport,
      })
    await expect(
      failing(503).upload(context(createFile()).ctx)
    ).rejects.toMatchObject({
      code: "http",
      status: 503,
      retryable: true,
    })
    await expect(
      failing(413).upload(context(createFile()).ctx)
    ).rejects.toMatchObject({
      status: 413,
      retryable: false,
    })
  })
})

describe("presignedAdapter", () => {
  it("PUTs to the signed URL and returns the object URL", async () => {
    const { transport, requests } = fakeTransport(() => ({ status: 200 }))
    const adapter = presignedAdapter({
      getTarget: async () => ({
        url: "https://bucket.s3.amazonaws.com/a.png?X-Amz-Signature=abc",
        key: "a.png",
      }),
      transport,
    })
    const result = await adapter.upload(
      context(createFile("a.png", 5, "image/png")).ctx
    )
    expect(result).toEqual({
      key: "a.png",
      url: "https://bucket.s3.amazonaws.com/a.png",
    })
    expect(requests[0]!.method).toBe("PUT")
    expect(requests[0]!.headers).toEqual({ "content-type": "image/png" })
  })

  it("supports S3 POST policies with form fields", async () => {
    const { transport, requests } = fakeTransport(() => ({ status: 204 }))
    const complete = vi.fn(async () => ({ saved: true }))
    const adapter = presignedAdapter({
      getTarget: () => ({
        url: "https://bucket",
        method: "POST",
        fields: { key: "k", policy: "p" },
      }),
      complete,
      transport,
    })
    await expect(adapter.upload(context(createFile()).ctx)).resolves.toEqual({
      saved: true,
    })
    const form = requests[0]!.body as FormData
    expect([...form.keys()]).toEqual(["key", "policy", "file"])
    expect(complete).toHaveBeenCalledOnce()
  })
})

function fakeRoute() {
  const calls: UploadRouteRequest[] = []
  const fetcher = vi.fn(
    async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as UploadRouteRequest
      calls.push(body)
      const respond = (data: unknown) =>
        new Response(JSON.stringify(data), { status: 200 })
      switch (body.action) {
        case "presign":
          return respond({
            key: "k1",
            url: "https://s3/put",
            method: "PUT",
            headers: { "content-type": body.file.type },
          })
        case "complete":
        case "complete-multipart":
          return respond({ key: body.key, url: `https://cdn/${body.key}` })
        case "create-multipart":
          return respond({ key: "big", uploadId: "u1" })
        case "sign-part":
          return respond({ url: `https://s3/part/${body.partNumber}` })
        case "list-parts":
          return respond({ parts: [] })
        case "abort-multipart":
          return respond({ ok: true })
      }
    }
  )
  return { calls, fetch: fetcher as unknown as typeof fetch }
}

describe("s3Adapter", () => {
  it("uses a single presigned PUT for small files, then completes", async () => {
    const route = fakeRoute()
    const { transport, requests } = fakeTransport(() => ({ status: 200 }))
    const adapter = s3Adapter({
      endpoint: "/api/upload",
      fetch: route.fetch,
      transport,
    })
    const result = await adapter.upload(context(createFile("a.txt", 100)).ctx)

    expect(route.calls.map((call) => call.action)).toEqual([
      "presign",
      "complete",
    ])
    expect(route.calls[0]).toMatchObject({ meta: { folder: "avatars" } })
    expect(requests[0]!.url).toBe("https://s3/put")
    expect(result).toEqual({ key: "k1", url: "https://cdn/k1" })
    expect(adapter.resumable).toBeInstanceOf(Function)
  })

  it("switches to multipart above the threshold", async () => {
    const route = fakeRoute()
    const { transport } = fakeTransport((request) => ({
      status: 200,
      headers: { etag: `"${request.url.split("/").at(-1)}"` },
    }))
    const adapter = s3Adapter({
      endpoint: "/api/upload",
      fetch: route.fetch,
      transport,
      multipart: { threshold: 6 * MiB, partSize: 5 * MiB },
    })
    const file = createFile("video.mp4", 11 * MiB, "video/mp4")
    const result = await adapter.upload(context(file).ctx)

    const actions = route.calls.map((call) => call.action)
    expect(actions[0]).toBe("create-multipart")
    expect(actions.filter((action) => action === "sign-part")).toHaveLength(3)
    expect(actions.at(-1)).toBe("complete-multipart")
    expect(route.calls.at(-1)).toMatchObject({
      parts: [
        { partNumber: 1, etag: '"1"' },
        { partNumber: 2, etag: '"2"' },
        { partNumber: 3, etag: '"3"' },
      ],
    })
    expect(result).toEqual({ key: "big", url: "https://cdn/big" })
  })

  it("explains missing ETag headers (CORS)", async () => {
    const route = fakeRoute()
    const { transport } = fakeTransport(() => ({ status: 200 }))
    const adapter = s3Adapter({
      endpoint: "/api/upload",
      fetch: route.fetch,
      transport,
      multipart: { threshold: 1 },
    })
    await expect(
      adapter.upload(context(createFile("a", 10)).ctx)
    ).rejects.toThrow(/ExposeHeaders/)
  })

  it("surfaces route errors with their message", async () => {
    const fetcher = (async () =>
      new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
      })) as typeof fetch
    const adapter = s3Adapter({ endpoint: "/api/upload", fetch: fetcher })
    await expect(
      adapter.upload(context(createFile()).ctx)
    ).rejects.toMatchObject({
      message: "Not signed in",
      status: 401,
      retryable: false,
    })
  })
})

describe("routeAdapter", () => {
  it("delegates by file and reports resumability per file", async () => {
    const small = mockAdapter({ latency: 0, resumable: false })
    const large = mockAdapter({ latency: 0, resumable: true })
    const adapter = routeAdapter((file) => (file.size > 10 ? large : small))
    const resumable = adapter.resumable as (file: File) => boolean
    expect(resumable(createFile("a", 5))).toBe(false)
    expect(resumable(createFile("a", 50))).toBe(true)
  })
})

describe("mockAdapter", () => {
  it("simulates progress and resumes from saved state", async () => {
    const adapter = mockAdapter({ speed: 1_000_000, latency: 0 })
    const saved: unknown[] = []
    const { ctx, progress } = context(createFile("a", 20_000), {
      resumeState: { loaded: 10_000 },
      saveResumeState: (state) => saved.push(state),
    })
    const result = await adapter.upload(ctx)
    expect(progress[0]).toBe(10_000)
    expect(progress.at(-1)).toBe(20_000)
    expect(result).toMatchObject({ url: expect.stringContaining("mock://") })
  })

  it("injects deterministic failures", async () => {
    const adapter = mockAdapter({
      speed: 10_000_000,
      latency: 0,
      fail: (ctx) =>
        ctx.attempt === 1
          ? (Object.assign(new Error("boom"), { code: "network" }) as never)
          : null,
    })
    await expect(
      adapter.upload(context(createFile("a", 100_000)).ctx)
    ).rejects.toThrow("boom")
    await expect(
      adapter.upload(context(createFile("a", 1000), { attempt: 2 }).ctx)
    ).resolves.toBeDefined()
  })
})
