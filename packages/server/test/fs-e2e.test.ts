import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

import { createUploader, s3Adapter, type Transport } from "@uploadcn/core"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { createUploadRoute } from "../src"
import { createFileSystemStorage } from "../src/fs"

const ORIGIN = "http://localhost"
let directory: string

beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "uploadcn-fs-e2e-"))
})

afterAll(async () => {
  await fs.rm(directory, { recursive: true, force: true })
})

function setup() {
  const files = createFileSystemStorage({
    directory,
    baseUrl: `${ORIGIN}/api/files`,
    secret: "e2e-secret",
  })
  const route = createUploadRoute({ storage: files.storage })
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) =>
    route.POST(
      new Request(new URL(String(input), ORIGIN), init)
    )) as typeof fetch
  const transport: Transport = async (request) => {
    const body = request.body as Blob
    const response = await files.handler(
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
  return { files, fetcher, transport }
}

async function upload(
  file: File,
  multipart: { threshold: number; partSize: number } | false
) {
  const { files, fetcher, transport } = setup()
  const uploader = createUploader({
    adapter: s3Adapter({
      endpoint: "/api/upload",
      fetch: fetcher,
      transport,
      multipart,
    }),
    network: false,
  })
  const [item] = await uploader.add([file])
  await vi.waitFor(
    () => {
      const status = uploader.getItem(item!.id)?.status
      if (status === "error")
        throw new Error(uploader.getItem(item!.id)?.error?.message)
      expect(status).toBe("success")
    },
    { timeout: 20_000 }
  )
  const result = uploader.getItem(item!.id)!.result as {
    key: string
    url: string
  }
  return { files, result }
}

describe("s3Adapter + createUploadRoute + local disk", () => {
  it("stores a single presigned upload on disk and serves it back", async () => {
    const { files, result } = await upload(
      new File(["hello disk"], "note.txt", { type: "text/plain" }),
      false
    )
    const written = await fs.readFile(path.join(directory, result.key), "utf8")
    expect(written).toBe("hello disk")
    const download = await files.handler(new Request(result.url))
    expect(await download.text()).toBe("hello disk")
  })

  it("assembles a multipart upload on disk", async () => {
    const bytes = new Uint8Array(new ArrayBuffer(12 * 1024 * 1024))
    for (let index = 0; index < bytes.length; index += 4096)
      bytes[index] = index % 251
    const { result } = await upload(
      new File([bytes], "video.bin", { type: "application/octet-stream" }),
      { threshold: 5 * 1024 * 1024, partSize: 5 * 1024 * 1024 }
    )
    const written = await fs.readFile(path.join(directory, result.key))
    expect(written.length).toBe(bytes.length)
    expect(Buffer.compare(written, Buffer.from(bytes))).toBe(0)
    // No leftover part files.
    const parts = await fs
      .readdir(path.join(directory, ".parts"))
      .catch(() => [])
    expect(parts).toEqual([])
  })
})
