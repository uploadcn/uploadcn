/**
 * S3 compatibility suite: runs UploadCN's real upload path (s3Adapter → route
 * → s3Storage) against live S3-compatible servers, so differences between
 * providers show up here instead of in production.
 *
 * Targets come from S3_COMPAT: comma-separated `name|endpoint|accessKey|secret[|sig]`;
 * `sig` marks servers that verify request signatures (Moto, for one, does not).
 * Without it the suite is skipped. CI starts SeaweedFS (Go, like Tigris and
 * MinIO) and Moto (mirrors AWS S3) and runs it on every pull request.
 */
import { MiB, type Transport, createUploader, s3Adapter } from "@uploadcn/core"
import { AwsClient } from "aws4fetch"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { createUploadRoute, s3Storage } from "../../src"

// Real servers over real HTTP: give each test room beyond Vitest's 5 s default.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 60_000 })

const ORIGIN = "http://localhost:3000"
const REGION = "us-east-1"

const targets = (process.env.S3_COMPAT ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [name, endpoint, accessKeyId, secretAccessKey, flags = ""] =
      entry.split("|")
    return {
      name: name!,
      endpoint: endpoint!,
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      verifiesSignatures: flags.split("+").includes("sig"),
    }
  })

/** Sends the adapter's storage requests over real HTTP, like the browser's XHR. */
const httpTransport: Transport = async (request) => {
  const body = request.body as Blob
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  })
  request.onUploadProgress?.(body.size, body.size)
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  }
}

const bytes = async (stream: ReadableStream<Uint8Array> | null) =>
  stream ? new Uint8Array(await new Response(stream).arrayBuffer()) : null

const pattern = (size: number, seed: number) => {
  const data = new Uint8Array(size)
  for (let i = 0; i < size; i++) data[i] = (i * 31 + seed) & 0xff
  return data
}

// Without live servers (a plain `pnpm test`), report the suite as skipped.
describe.skipIf(targets.length > 0)("S3 compatibility", () => {
  it.skip("runs against live servers when S3_COMPAT is set", () => {})
})

describe.each(targets)("S3 compatibility: $name", (target) => {
  const bucket = `uploadcn-compat-${Date.now().toString(36)}`
  const aws = new AwsClient({
    accessKeyId: target.accessKeyId,
    secretAccessKey: target.secretAccessKey,
    region: REGION,
    service: "s3",
  })
  const storage = s3Storage({
    bucket,
    region: REGION,
    endpoint: target.endpoint,
    accessKeyId: target.accessKeyId,
    secretAccessKey: target.secretAccessKey,
  })
  const route = createUploadRoute({ storage })
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) =>
    route.POST(
      new Request(new URL(String(input), ORIGIN), init)
    )) as typeof fetch

  const uploaderFor = (
    multipart?: Parameters<typeof s3Adapter>[0]["multipart"]
  ) =>
    createUploader({
      adapter: s3Adapter({
        endpoint: "/api/upload",
        fetch: fetcher,
        transport: httpTransport,
        multipart,
      }),
      network: false,
    })

  beforeAll(async () => {
    const created = await aws.fetch(`${target.endpoint}/${bucket}`, {
      method: "PUT",
    })
    expect(
      created.ok,
      `create bucket: ${created.status} ${await created.text()}`
    ).toBe(true)
  })

  it("uploads a small file through the route and reads it back", async () => {
    const uploader = uploaderFor()
    const data = pattern(64 * 1024, 1)
    const [item] = await uploader.add([
      new File([data], "Report Q3.pdf", { type: "application/pdf" }),
    ])
    await vi.waitFor(
      () => expect(uploader.getItem(item!.id)?.status).toBe("success"),
      { timeout: 20_000 }
    )

    const { key } = uploader.getItem(item!.id)!.result!
    expect(await storage.headObject(key)).toMatchObject({ size: data.length })
    expect(await bytes((await storage.getObject!(key))!)).toEqual(data)
    const viaUrl = await fetch(await storage.getUrl(key))
    expect(new Uint8Array(await viaUrl.arrayBuffer())).toEqual(data)
  })

  it("uploads a large file in parallel parts through the route", async () => {
    const uploader = uploaderFor({
      threshold: 5 * MiB,
      partSize: 5 * MiB,
      concurrency: 3,
    })
    const data = pattern(12 * MiB + 123, 2)
    const [item] = await uploader.add([
      new File([data], "clip.mp4", { type: "video/mp4" }),
    ])
    await vi.waitFor(
      () => expect(uploader.getItem(item!.id)?.status).toBe("success"),
      { timeout: 60_000 }
    )

    const done = uploader.getItem(item!.id)!
    expect(done.chunks).toEqual({ completed: 3, total: 3 })
    expect(await storage.headObject(done.result!.key)).toMatchObject({
      size: data.length,
    })
    expect(await bytes((await storage.getObject!(done.result!.key))!)).toEqual(
      data
    )
  })

  it("resumes: ETags from ListParts complete the upload (the restore path)", async () => {
    const key = "resume/after-reload.bin"
    const { uploadId } = await storage.createMultipart({
      key,
      contentType: "application/octet-stream",
    })
    const fromPut: { partNumber: number; etag: string }[] = []
    for (const [partNumber, size] of [
      [1, 5 * MiB],
      [2, 5 * MiB],
      [3, 1024],
    ] as const) {
      const url = await storage.presignPart({
        key,
        uploadId,
        partNumber,
        expiresIn: 600,
      })
      const response = await fetch(url, {
        method: "PUT",
        body: pattern(size, partNumber),
      })
      expect(response.ok).toBe(true)
      fromPut.push({ partNumber, etag: response.headers.get("etag")! })
    }
    // After a reload the browser has lost the ETags and asks the bucket for them.
    const listed = await storage.listParts({ key, uploadId })
    expect(
      listed?.map(({ partNumber, etag }) => ({ partNumber, etag }))
    ).toEqual(fromPut)
    await storage.completeMultipart({
      key,
      uploadId,
      parts: listed!.map(({ partNumber, etag }) => ({ partNumber, etag })),
    })
    expect(await storage.headObject(key)).toMatchObject({
      size: 10 * MiB + 1024,
    })
  })

  it("round-trips keys with spaces, unicode and reserved characters", async () => {
    const key = "folder/my file (1) é ü 测试 +&=@,;$!'~.txt"
    const data = pattern(1000, 3)
    const put = await storage.presignPut({
      key,
      contentType: "text/plain",
      contentLength: data.length,
      expiresIn: 600,
    })
    const response = await fetch(put.url, {
      method: "PUT",
      headers: put.headers,
      body: data,
    })
    expect(response.ok, `PUT ${response.status} ${await response.text()}`).toBe(
      true
    )
    expect(await storage.headObject(key)).toMatchObject({ size: data.length })
    expect(await bytes((await storage.getObject!(key))!)).toEqual(data)
    await storage.deleteObject(key)
    expect(await storage.headObject(key)).toBeNull()
  })

  it("aborts multipart uploads so they can't be completed", async () => {
    const key = "aborted/upload.bin"
    const { uploadId } = await storage.createMultipart({
      key,
      contentType: "application/octet-stream",
    })
    const url = await storage.presignPart({
      key,
      uploadId,
      partNumber: 1,
      expiresIn: 600,
    })
    const response = await fetch(url, {
      method: "PUT",
      body: pattern(1024, 4),
    })
    const etag = response.headers.get("etag")!
    await storage.abortMultipart({ key, uploadId })
    await expect(
      storage.completeMultipart({
        key,
        uploadId,
        parts: [{ partNumber: 1, etag }],
      })
    ).rejects.toThrow()
    expect(await storage.headObject(key)).toBeNull()
  })

  it("rejects completing with an ETag the bucket doesn't have", async () => {
    const key = "invalid/part.bin"
    const { uploadId } = await storage.createMultipart({
      key,
      contentType: "application/octet-stream",
    })
    const url = await storage.presignPart({
      key,
      uploadId,
      partNumber: 1,
      expiresIn: 600,
    })
    await fetch(url, { method: "PUT", body: pattern(1024, 5) })
    await expect(
      storage.completeMultipart({
        key,
        uploadId,
        parts: [{ partNumber: 1, etag: '"00000000000000000000000000000000"' }],
      })
    ).rejects.toThrow()
    await storage.abortMultipart({ key, uploadId })
  })

  it("treats missing objects as missing, not as errors", async () => {
    expect(await storage.headObject("missing/nothing-here.bin")).toBeNull()
    expect(await storage.getObject!("missing/nothing-here.bin")).toBeNull()
    await expect(
      storage.deleteObject("missing/nothing-here.bin")
    ).resolves.toBeUndefined()
  })

  describe.runIf(target.verifiesSignatures)("signed URLs", () => {
    let n = 0
    const signed = (contentLength: number, expiresIn = 600) =>
      storage.presignPut({
        key: `locked/${++n}.png`,
        contentType: "image/png",
        contentLength,
        expiresIn,
      })

    it("reject a different content type than the one signed", async () => {
      const put = await signed(100)
      const response = await fetch(put.url, {
        method: "PUT",
        headers: { "content-type": "text/html" },
        body: pattern(100, 6),
      })
      expect(response.status).toBe(403)
    })

    it("reject a body of a different size than the one signed", async () => {
      const put = await signed(100)
      const response = await fetch(put.url, {
        method: "PUT",
        headers: put.headers,
        body: pattern(5000, 7),
      })
      expect(response.ok).toBe(false)
    })

    it("stop working once they expire", async () => {
      const put = await signed(100, 1)
      await new Promise((resolve) => setTimeout(resolve, 2500))
      const response = await fetch(put.url, {
        method: "PUT",
        headers: put.headers,
        body: pattern(100, 8),
      })
      expect(response.status).toBe(403)
    })

    it("reject a tampered signature", async () => {
      const put = await signed(100)
      const url = new URL(put.url)
      const signature = url.searchParams.get("X-Amz-Signature")!
      url.searchParams.set(
        "X-Amz-Signature",
        signature.replace(/.$/, (c) => (c === "0" ? "1" : "0"))
      )
      const response = await fetch(url, {
        method: "PUT",
        headers: put.headers,
        body: pattern(100, 9),
      })
      expect(response.status).toBe(403)
    })
  })
})
