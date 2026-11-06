/**
 * Cloudinary live suite: runs cloudinaryAdapter and signCloudinaryParams
 * against a real Cloudinary account, the way the docs tell users to wire them.
 *
 * Credentials come from the environment, or from apps/docs/.env.local:
 *   CLOUDINARY_CLOUD_NAME      required
 *   CLOUDINARY_UPLOAD_PRESET   an unsigned preset (unsigned tests)
 *   CLOUDINARY_API_KEY         } signed tests and cleanup
 *   CLOUDINARY_API_SECRET      }
 * CLOUDINARY_URL (cloudinary://key:secret@cloud) works too.
 * Without a cloud name the suite is skipped. Every asset it creates is tagged
 * `uploadcn-test` and deleted at the end when the API secret is available.
 */
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
  type CloudinarySignature,
  type CloudinaryUploadResult,
  type Transport,
  type UploadAdapterContext,
  type UploadItem,
  cloudinaryAdapter,
  createUploader,
} from "@uploadcn/core"
import { afterAll, describe, expect, it, vi } from "vitest"

import { signCloudinaryParams } from "../../src"

vi.setConfig({ testTimeout: 120_000, hookTimeout: 60_000 })

const envFile = fileURLToPath(
  new URL("../../../../apps/docs/.env.local", import.meta.url)
)
if (!process.env.CLOUDINARY_CLOUD_NAME && existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

const fromUrl = process.env.CLOUDINARY_URL
  ? new URL(process.env.CLOUDINARY_URL)
  : undefined
const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? fromUrl?.hostname
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET
const apiKey =
  process.env.CLOUDINARY_API_KEY ?? decodeURIComponent(fromUrl?.username ?? "")
const apiSecret =
  process.env.CLOUDINARY_API_SECRET ??
  decodeURIComponent(fromUrl?.password ?? "")

const API = `https://api.cloudinary.com/v1_1/${cloudName}`
const ORIGIN = "http://localhost:3000"
const RUN = `uploadcn-test/${Date.now().toString(36)}`
const TAGS = "uploadcn-test"
/** Cloudinary's smallest chunk. Free plans cap raw files at 10 MB, so two chunks stay under it. */
const CHUNK = 5 * 1024 * 1024
const LARGE = CHUNK + 1_000_000

/** A 1×1 PNG. */
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  ),
  (c) => c.charCodeAt(0)
)

const created: { publicId: string; resourceType: string }[] = []
const track = (result: CloudinaryUploadResult) => {
  created.push({
    publicId: result.public_id,
    resourceType: result.resource_type,
  })
  return result
}

const pattern = (size: number, seed: number) => {
  const data = new Uint8Array(size)
  for (let i = 0; i < size; i++) data[i] = (i * 31 + seed) & 0xff
  return data
}

const download = async (url: string) =>
  new Uint8Array(await (await fetch(url)).arrayBuffer())

/** Sends the adapter's requests over real HTTP, like the browser's XHR. */
const sent: { headers: Record<string, string> }[] = []
const httpTransport: Transport = async (request) => {
  sent.push({ headers: { ...request.headers } })
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body as BodyInit,
    signal: request.signal,
  })
  request.onUploadProgress?.(1, 1)
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  }
}

/** The signing route from the docs, called the way the browser would. */
const signingRoute = async (request: Request) => {
  const params = (await request.json()) as Record<string, string>
  if (!params.folder?.startsWith(RUN)) {
    return new Response("Forbidden", { status: 403 })
  }
  return Response.json(
    await signCloudinaryParams(params, { apiKey, apiSecret })
  )
}
let signatures = 0
const sign = async (params: Record<string, string>) => {
  signatures++
  const response = await signingRoute(
    new Request(`${ORIGIN}/api/cloudinary`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    })
  )
  if (!response.ok) throw new Error(`signing route: ${response.status}`)
  return (await response.json()) as CloudinarySignature
}

function context(file: File, overrides: Partial<UploadAdapterContext> = {}) {
  const saved: unknown[] = []
  const ctx: UploadAdapterContext = {
    item: { id: crypto.randomUUID(), meta: {}, file } as unknown as UploadItem,
    file,
    signal: new AbortController().signal,
    attempt: 1,
    resumeState: undefined,
    onProgress: () => {},
    onChunkProgress: () => {},
    saveResumeState: (state) => saved.push(state),
    ...overrides,
  }
  return { ctx, saved }
}

/** Deletes an asset with a signed destroy call, as a server would. */
async function destroy(publicId: string, resourceType: string) {
  const signed = await signCloudinaryParams(
    { public_id: publicId, invalidate: "true" },
    { apiKey, apiSecret }
  )
  const body = new FormData()
  body.append("public_id", publicId)
  body.append("invalidate", "true")
  body.append("api_key", signed.apiKey)
  body.append("timestamp", String(signed.timestamp))
  body.append("signature", signed.signature)
  const response = await fetch(`${API}/${resourceType}/destroy`, {
    method: "POST",
    body,
  })
  return (await response.json()) as { result?: string }
}

describe.skipIf(!!cloudName)("Cloudinary live", () => {
  it.skip("runs against a real account when CLOUDINARY_CLOUD_NAME is set", () => {})
})

describe.runIf(!!cloudName)("Cloudinary live", () => {
  afterAll(async () => {
    if (!apiSecret) return
    for (const { publicId, resourceType } of created) {
      await destroy(publicId, resourceType)
    }
  })

  it("lets the browser send chunk headers (CORS preflight)", async () => {
    const response = await fetch(`${API}/auto/upload`, {
      method: "OPTIONS",
      headers: {
        origin: ORIGIN,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-range,x-unique-upload-id",
      },
    })
    expect(response.status).toBeLessThan(300)
    const allowOrigin = response.headers.get("access-control-allow-origin")
    expect([ORIGIN, "*"]).toContain(allowOrigin)
    const allowHeaders = (
      response.headers.get("access-control-allow-headers") ?? ""
    ).toLowerCase()
    expect(allowHeaders).toContain("content-range")
    expect(allowHeaders).toContain("x-unique-upload-id")
  })

  describe.runIf(!!uploadPreset)("unsigned preset", () => {
    const adapter = (chunkSize?: number) =>
      cloudinaryAdapter({
        cloudName: cloudName!,
        uploadPreset,
        folder: `${RUN}/unsigned`,
        params: { tags: TAGS },
        chunkSize,
        transport: httpTransport,
      })

    it("uploads an image through the engine and reports its dimensions", async () => {
      const uploader = createUploader({ adapter: adapter(), network: false })
      const [item] = await uploader.add([
        new File([PNG], "pixel.png", { type: "image/png" }),
      ])
      await vi.waitFor(
        () => {
          const current = uploader.getItem(item!.id)
          expect(current?.error?.message).toBeUndefined()
          expect(current?.status).toBe("success")
        },
        { timeout: 30_000 }
      )
      const result = track(
        uploader.getItem(item!.id)!.result as CloudinaryUploadResult
      )
      expect(result).toMatchObject({
        resource_type: "image",
        format: "png",
        width: 1,
        height: 1,
      })
      expect(result.secure_url).toMatch(/^https:\/\/res\.cloudinary\.com\//)
      expect(await download(result.secure_url)).toEqual(PNG)
    })

    it("uploads a raw file byte for byte", async () => {
      const data = pattern(256 * 1024, 1)
      const { ctx } = context(
        new File([data], "notes v1 (é).txt", {
          type: "text/plain",
        })
      )
      const result = track(await adapter().upload(ctx))
      expect(result).toMatchObject({ resource_type: "raw", bytes: data.length })
      expect(await download(result.secure_url)).toEqual(data)
    })

    it("uploads a large file in chunks with one upload id", async () => {
      const data = pattern(LARGE, 2)
      const chunks: number[][] = []
      const before = sent.length
      const { ctx, saved } = context(
        new File([data], "large.txt", { type: "text/plain" }),
        { onChunkProgress: (done, total) => chunks.push([done, total]) }
      )
      const result = track(await adapter(CHUNK).upload(ctx))
      expect(chunks).toEqual([
        [1, 2],
        [2, 2],
      ])
      expect(saved).toHaveLength(2)
      const ids = new Set(
        sent.slice(before).map((r) => r.headers["x-unique-upload-id"])
      )
      expect(ids.size).toBe(1)
      expect(result).toMatchObject({ resource_type: "raw", bytes: data.length })
      expect(await download(result.secure_url)).toEqual(data)
    })

    it("resumes a chunked upload from the saved state, sending only what's left", async () => {
      const data = pattern(LARGE, 3)
      const file = new File([data], "resume.txt", {
        type: "text/plain",
      })

      // First run: the connection drops after the first chunk.
      let calls = 0
      const flaky: Transport = (request) =>
        ++calls === 1
          ? httpTransport(request)
          : Promise.reject(new Error("network down"))
      const first = context(file)
      await expect(
        cloudinaryAdapter({
          cloudName: cloudName!,
          uploadPreset,
          folder: `${RUN}/unsigned`,
          params: { tags: TAGS },
          chunkSize: CHUNK,
          transport: flaky,
        }).upload(first.ctx)
      ).rejects.toThrow("network down")
      expect(first.saved).toHaveLength(1)
      const state = first.saved[0] as { offset: number; uploadId: string }
      expect(state.offset).toBe(CHUNK)

      // Second run (a retry or a reload): only the rest goes up.
      const before = sent.length
      const second = context(file, { resumeState: state })
      const result = track(await adapter(CHUNK).upload(second.ctx))
      const requests = sent.slice(before)
      expect(requests).toHaveLength(1)
      expect(requests[0]!.headers).toMatchObject({
        "x-unique-upload-id": state.uploadId,
        "content-range": `bytes ${CHUNK}-${LARGE - 1}/${LARGE}`,
      })
      expect(result.bytes).toBe(LARGE)
      expect(await download(result.secure_url)).toEqual(data)
    })

    it("rejects a preset that doesn't exist with a clear error", async () => {
      const { ctx } = context(new File([PNG], "x.png", { type: "image/png" }))
      await expect(
        cloudinaryAdapter({
          cloudName: cloudName!,
          uploadPreset: `missing-${Date.now()}`,
          transport: httpTransport,
        }).upload(ctx)
      ).rejects.toMatchObject({
        code: "http",
        message: expect.stringMatching(/^Cloudinary: .*preset/i),
      })
    })
  })

  describe.runIf(!!apiKey && !!apiSecret)("signed by a server route", () => {
    const folder = `${RUN}/signed`
    const adapter = (chunkSize?: number) =>
      cloudinaryAdapter({
        cloudName: cloudName!,
        folder,
        params: { tags: TAGS },
        sign,
        chunkSize,
        transport: httpTransport,
      })

    it("uploads with a signature from the route", async () => {
      const data = pattern(64 * 1024, 4)
      const { ctx } = context(
        new File([data], "signed.txt", { type: "text/plain" })
      )
      const result = track(await adapter().upload(ctx))
      expect(result.bytes).toBe(data.length)
      expect(
        result.asset_folder === folder || result.public_id.startsWith(folder)
      ).toBe(true)
      expect(await download(result.secure_url)).toEqual(data)
    })

    it("signs once for a chunked upload", async () => {
      const data = pattern(LARGE, 5)
      signatures = 0
      const { ctx } = context(
        new File([data], "signed-large.txt", {
          type: "text/plain",
        })
      )
      const result = track(await adapter(CHUNK).upload(ctx))
      expect(signatures).toBe(1)
      expect(result.bytes).toBe(LARGE)
      expect(await download(result.secure_url)).toEqual(data)
    })

    it("re-signs when a saved signature is over the one-hour limit", async () => {
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 60 * 60
      const stale = await signCloudinaryParams(
        { folder, tags: TAGS },
        { apiKey, apiSecret, timestamp: twoHoursAgo }
      )

      // Cloudinary itself refuses it, which is why the adapter re-signs.
      const body = new FormData()
      body.append("folder", folder)
      body.append("tags", TAGS)
      body.append("api_key", stale.apiKey)
      body.append("timestamp", String(stale.timestamp))
      body.append("signature", stale.signature)
      body.append("file", new Blob([PNG]), "stale.png")
      const refused = await fetch(`${API}/auto/upload`, {
        method: "POST",
        body,
      })
      expect(refused.ok).toBe(false)
      expect(await refused.text()).toMatch(/stale/i)

      signatures = 0
      const { ctx } = context(
        new File([PNG], "fresh.png", { type: "image/png" }),
        { resumeState: { uploadId: "unused", offset: 0, signature: stale } }
      )
      const result = track(await adapter().upload(ctx))
      expect(signatures).toBe(1)
      expect(result.resource_type).toBe("image")
    })

    it("refuses a signature made with the wrong secret", async () => {
      const { ctx } = context(new File([PNG], "x.png", { type: "image/png" }))
      await expect(
        cloudinaryAdapter({
          cloudName: cloudName!,
          folder,
          sign: (params) =>
            signCloudinaryParams(params, {
              apiKey,
              apiSecret: `${apiSecret}-wrong`,
            }),
          transport: httpTransport,
        }).upload(ctx)
      ).rejects.toMatchObject({ code: "http" })
    })

    it("refuses tampered parameters (signed one folder, sent another)", async () => {
      const { ctx } = context(new File([PNG], "x.png", { type: "image/png" }))
      await expect(
        cloudinaryAdapter({
          cloudName: cloudName!,
          folder: `${RUN}/elsewhere`,
          sign: (params) =>
            signCloudinaryParams({ ...params, folder }, { apiKey, apiSecret }),
          transport: httpTransport,
        }).upload(ctx)
      ).rejects.toMatchObject({ code: "http" })
    })

    it("refuses to sign folders the route doesn't allow", async () => {
      const response = await signingRoute(
        new Request(`${ORIGIN}/api/cloudinary`, {
          method: "POST",
          body: JSON.stringify({ folder: "someone-else" }),
        })
      )
      expect(response.status).toBe(403)
    })

    it("deletes an uploaded asset", async () => {
      const { ctx } = context(
        new File([pattern(1000, 6)], "delete-me.txt", {
          type: "text/plain",
        })
      )
      const result = await adapter().upload(ctx)
      expect(await destroy(result.public_id, result.resource_type)).toEqual(
        expect.objectContaining({ result: "ok" })
      )
      expect(await destroy(result.public_id, result.resource_type)).toEqual(
        expect.objectContaining({ result: "not found" })
      )
    })
  })
})
