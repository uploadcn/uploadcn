import { MiB, type Transport, createUploader, s3Adapter } from "@uploadcn/core"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  UploadRouteError,
  createMemoryStorage,
  createUploadRoute,
  r2Storage,
  s3Storage,
  sanitizeFileName,
} from "../src"

const ORIGIN = "http://localhost"

function setup(options: Partial<Parameters<typeof createUploadRoute>[0]> = {}) {
  const memory = createMemoryStorage({
    baseUrl: `${ORIGIN}/storage`,
    secret: "test-secret",
  })
  const route = createUploadRoute({ storage: memory.storage, ...options })

  // The browser talks to the route via fetch and to storage via XHR; wire
  // both straight into the handlers.
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) =>
    route.POST(
      new Request(new URL(String(input), ORIGIN), init)
    )) as typeof fetch
  const transport: Transport = async (request) => {
    const body = request.body as Blob
    const response = await memory.handler(
      new Request(new URL(request.url, ORIGIN), {
        method: request.method,
        headers: { ...request.headers, "content-length": String(body.size) },
        body,
      })
    )
    request.onUploadProgress?.(body.size, body.size)
    return {
      status: response.status,
      headers: response.headers,
      body: await response.text(),
    }
  }
  return { route, memory, fetcher, transport }
}

const call = (route: { POST(r: Request): Promise<Response> }, body: unknown) =>
  route.POST(
    new Request(`${ORIGIN}/api/upload`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  )

describe("createUploadRoute + s3Adapter (end to end)", () => {
  it("uploads small files with a presigned PUT and completes them", async () => {
    const onUploadComplete = vi.fn(async () => ({ id: 7 }))
    const { fetcher, transport } = setup({ onUploadComplete })
    const uploader = createUploader({
      adapter: s3Adapter({
        endpoint: "/api/upload",
        fetch: fetcher,
        transport,
      }),
      network: false,
    })
    const [item] = await uploader.add(
      [new File(["hello world"], "Hello World.txt", { type: "text/plain" })],
      {
        meta: { folder: "notes" },
      }
    )
    await vi.waitFor(() =>
      expect(uploader.getItem(item!.id)?.status).toBe("success")
    )

    const result = uploader.getItem(item!.id)!.result!
    expect(result.key).toMatch(/^[0-9a-f-]{36}\/Hello-World\.txt$/)
    expect(result.data).toEqual({ id: 7 })
    expect(onUploadComplete).toHaveBeenCalledWith(
      expect.objectContaining({ key: result.key, meta: { folder: "notes" } })
    )
  })

  it("uploads large files in parallel parts and completes the multipart upload", async () => {
    const { fetcher, transport, memory } = setup()
    const uploader = createUploader({
      adapter: s3Adapter({
        endpoint: "/api/upload",
        fetch: fetcher,
        transport,
        multipart: { threshold: 5 * MiB, partSize: 5 * MiB, concurrency: 3 },
      }),
      network: false,
    })
    const size = 12 * MiB
    const [item] = await uploader.add([
      new File([new Uint8Array(size)], "video.mp4", { type: "video/mp4" }),
    ])
    await vi.waitFor(
      () => expect(uploader.getItem(item!.id)?.status).toBe("success"),
      { timeout: 5000 }
    )

    const done = uploader.getItem(item!.id)!
    expect(done.chunks).toEqual({ completed: 3, total: 3 })
    expect(await memory.storage.headObject(done.result!.key)).toMatchObject({
      size,
    })
  })
})

describe("createUploadRoute validation and security", () => {
  it("enforces size and type limits before signing", async () => {
    const { route } = setup({ maxFileSize: 100, allowedTypes: "image/*" })
    const big = await call(route, {
      action: "presign",
      file: { name: "a.png", type: "image/png", size: 101 },
    })
    expect(big.status).toBe(413)
    const wrongType = await call(route, {
      action: "presign",
      file: { name: "a.exe", type: "application/x-msdownload", size: 1 },
    })
    expect(wrongType.status).toBe(415)
    expect(await wrongType.json()).toEqual({
      error: "File type is not allowed",
    })
  })

  it("rejects malformed requests", async () => {
    const { route } = setup()
    expect((await call(route, { action: "nope" })).status).toBe(400)
    expect(
      (
        await call(route, {
          action: "sign-part",
          key: "k",
          uploadId: "u",
          partNumber: 0,
        })
      ).status
    ).toBe(400)
    expect(
      (
        await call(route, {
          action: "presign",
          file: { name: "a", type: "t", size: -1 },
        })
      ).status
    ).toBe(400)
    const notJson = await route.POST(
      new Request(`${ORIGIN}/api/upload`, { method: "POST", body: "{" })
    )
    expect(notJson.status).toBe(400)
    const get = await route.POST(new Request(`${ORIGIN}/api/upload`))
    expect(get.status).toBe(405)
  })

  it("runs authorize for every action and passes the result along", async () => {
    const getKey = vi.fn(({ auth, file }) => `${auth.userId}/${file.name}`)
    const { route } = setup({
      authorize: ({ request }) => {
        if (request.headers.get("authorization") !== "Bearer ok")
          throw new UploadRouteError("Unauthorized", 401)
        return { userId: "u1" }
      },
      getKey,
    })
    expect(
      (
        await call(route, {
          action: "presign",
          file: { name: "a.txt", type: "text/plain", size: 1 },
        })
      ).status
    ).toBe(401)

    const response = await route.POST(
      new Request(`${ORIGIN}/api/upload`, {
        method: "POST",
        headers: { authorization: "Bearer ok" },
        body: JSON.stringify({
          action: "presign",
          file: { name: "a.txt", type: "text/plain", size: 1 },
        }),
      })
    )
    expect(await response.json()).toMatchObject({
      key: "u1/a.txt",
      method: "PUT",
    })
  })

  it("refuses to complete uploads that never happened", async () => {
    const { memory } = setup()
    const route = createUploadRoute({
      storage: { ...memory.storage, headObject: async () => null },
    })
    const response = await call(route, {
      action: "complete",
      key: "ghost.txt",
      file: { name: "ghost.txt", type: "text/plain", size: 1 },
    })
    expect(response.status).toBe(409)
  })

  it("hides internal errors", async () => {
    const { route } = setup({
      onUploadComplete: () => {
        throw new Error("database password leaked")
      },
      verify: false,
    })
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const response = await call(route, {
      action: "complete",
      key: "k",
      file: { name: "k", type: "text/plain", size: 1 },
    })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Upload failed" })
    spy.mockRestore()
  })
})

describe("memory storage", () => {
  it("rejects tampered or mismatched uploads", async () => {
    const { memory } = setup()
    const { url } = await memory.storage.presignPut({
      key: "a",
      contentType: "text/plain",
      contentLength: 3,
      expiresIn: 60,
    })
    const tampered = url.replace(/token=./, "token=x")
    expect(
      (
        await memory.handler(
          new Request(tampered, { method: "PUT", body: "abc" })
        )
      ).status
    ).toBe(403)
    expect(
      (await memory.handler(new Request(url, { method: "PUT", body: "abcd" })))
        .status
    ).toBe(400)
    const ok = await memory.handler(
      new Request(url, { method: "PUT", body: "abc" })
    )
    expect(ok.status).toBe(200)
    expect(ok.headers.get("etag")).toMatch(/^"3-/)
  })
})

describe("s3Storage", () => {
  afterEach(() => vi.restoreAllMocks())

  const storage = s3Storage({
    bucket: "my-bucket",
    region: "us-east-1",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "secret",
  })

  it("presigns PUTs that lock the content type and length", async () => {
    const { url, headers } = await storage.presignPut({
      key: "folder/My File.png",
      contentType: "image/png",
      contentLength: 1234,
      expiresIn: 600,
    })
    const parsed = new URL(url)
    expect(parsed.host).toBe("my-bucket.s3.us-east-1.amazonaws.com")
    expect(parsed.pathname).toBe("/folder/My%20File.png")
    expect(parsed.searchParams.get("X-Amz-Expires")).toBe("600")
    expect(parsed.searchParams.get("X-Amz-SignedHeaders")).toBe(
      "content-length;content-type;host"
    )
    expect(parsed.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/)
    expect(headers).toEqual({ "content-type": "image/png" })
  })

  it("presigns multipart parts", async () => {
    const url = new URL(
      await storage.presignPart({
        key: "k",
        uploadId: "abc",
        partNumber: 3,
        expiresIn: 60,
      })
    )
    expect(url.searchParams.get("partNumber")).toBe("3")
    expect(url.searchParams.get("uploadId")).toBe("abc")
  })

  it("creates, lists and completes multipart uploads via the XML API", async () => {
    const requests: Request[] = []
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const request = input as Request
      requests.push(request.clone())
      const url = new URL(request.url)
      if (request.method === "POST" && url.searchParams.has("uploads")) {
        return new Response(
          "<InitiateMultipartUploadResult><UploadId>up-1</UploadId></InitiateMultipartUploadResult>"
        )
      }
      if (request.method === "GET") {
        return new Response(
          "<ListPartsResult><IsTruncated>false</IsTruncated><Part><PartNumber>1</PartNumber><ETag>&quot;e1&quot;</ETag><Size>5</Size></Part></ListPartsResult>"
        )
      }
      return new Response(
        "<CompleteMultipartUploadResult><ETag>&quot;final&quot;</ETag></CompleteMultipartUploadResult>"
      )
    })

    expect(
      await storage.createMultipart({ key: "k", contentType: "video/mp4" })
    ).toEqual({ uploadId: "up-1" })
    expect(await storage.listParts({ key: "k", uploadId: "up-1" })).toEqual([
      { partNumber: 1, etag: '"e1"', size: 5 },
    ])
    const completed = await storage.completeMultipart({
      key: "k",
      uploadId: "up-1",
      parts: [
        { partNumber: 2, etag: '"e2"' },
        { partNumber: 1, etag: '"e1"' },
      ],
    })
    expect(completed).toEqual({ etag: '"final"' })

    const body = await requests.at(-1)!.text()
    expect(body).toBe(
      "<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>&quot;e1&quot;</ETag></Part><Part><PartNumber>2</PartNumber><ETag>&quot;e2&quot;</ETag></Part></CompleteMultipartUpload>"
    )
    expect(requests[0]!.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256/
    )
  })

  it("surfaces S3 errors returned with a 200 status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        "<Error><Code>InvalidPart</Code><Message>bad part</Message></Error>"
      )
    )
    await expect(
      storage.completeMultipart({
        key: "k",
        uploadId: "u",
        parts: [{ partNumber: 1, etag: "x" }],
      })
    ).rejects.toThrow(/InvalidPart/)
  })

  it("uses path-style R2 endpoints with region auto", async () => {
    const r2 = r2Storage({
      accountId: "acc",
      bucket: "b",
      accessKeyId: "k",
      secretAccessKey: "s",
      publicUrl: "https://cdn.example.com/",
    })
    const url = new URL(
      (
        await r2.presignPut({
          key: "a.txt",
          contentType: "text/plain",
          contentLength: 1,
          expiresIn: 60,
        })
      ).url
    )
    expect(url.host).toBe("acc.r2.cloudflarestorage.com")
    expect(url.pathname).toBe("/b/a.txt")
    expect(url.searchParams.get("X-Amz-Credential")).toContain(
      "/auto/s3/aws4_request"
    )
    expect(await r2.getUrl("a b.txt")).toBe("https://cdn.example.com/a%20b.txt")
  })
})

describe("sanitizeFileName", () => {
  it("keeps names safe and readable", () => {
    expect(sanitizeFileName("Résumé (final) v2.pdf")).toBe(
      "Resume-final-v2.pdf"
    )
    expect(sanitizeFileName("../../etc/passwd")).toBe("etcpasswd")
    expect(sanitizeFileName("")).toBe("file")
  })
})
