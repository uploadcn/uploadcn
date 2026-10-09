import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { signCloudinaryParams } from "../src/cloudinary"
import { createFileSystemStorage } from "../src/fs"

let directory: string
let files: ReturnType<typeof createFileSystemStorage>

beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "uploadcn-fs-"))
  files = createFileSystemStorage({
    directory,
    baseUrl: "http://localhost/api/files",
    secret: "test-secret",
  })
})

afterAll(async () => {
  await fs.rm(directory, { recursive: true, force: true })
})

const bytes = (size: number, fill = 1) =>
  new Uint8Array(new ArrayBuffer(size)).fill(fill)

function put(url: string, body: Uint8Array<ArrayBuffer>) {
  return files.handler(new Request(url, { method: "PUT", body }))
}

describe("createFileSystemStorage", () => {
  it("writes a presigned PUT to disk and serves a signed download", async () => {
    const { url } = await files.storage.presignPut({
      key: "avatars/me.png",
      contentType: "image/png",
      contentLength: 5,
      expiresIn: 60,
    })
    const response = await put(url, bytes(5, 7))
    expect(response.status).toBe(200)
    expect(response.headers.get("etag")).toMatch(/^"5-/)
    expect(await files.storage.headObject("avatars/me.png")).toEqual({
      size: 5,
    })

    const download = await files.handler(
      new Request(await files.storage.getUrl("avatars/me.png"))
    )
    expect(download.status).toBe(200)
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(bytes(5, 7))
  })

  it("rejects bodies that don't match the signed size, and tampered tokens", async () => {
    const { url } = await files.storage.presignPut({
      key: "a.txt",
      contentType: "text/plain",
      contentLength: 3,
      expiresIn: 60,
    })
    expect((await put(url, bytes(4))).status).toBe(413)
    expect(await files.storage.headObject("a.txt")).toBeNull()
    expect((await put(`${url}x`, bytes(3))).status).toBe(403)
    // A download token can't be used to upload.
    const download = await files.storage.getUrl("a.txt")
    expect((await put(download, bytes(3))).status).toBe(403)
  })

  it("refuses keys that escape the directory", async () => {
    await expect(
      files.storage.presignPut({
        key: "../outside.txt",
        contentType: "text/plain",
        contentLength: 1,
        expiresIn: 60,
      })
    ).rejects.toThrow(/Invalid object key/)
    await expect(files.storage.headObject("/etc/passwd")).rejects.toThrow()
  })

  it("assembles multipart uploads in order and lists parts for resume", async () => {
    const { uploadId } = await files.storage.createMultipart({
      key: "videos/clip.mp4",
      contentType: "video/mp4",
    })
    const etags: { partNumber: number; etag: string }[] = []
    for (const [partNumber, fill] of [
      [2, 2],
      [1, 1],
    ] as const) {
      const url = await files.storage.presignPart({
        key: "videos/clip.mp4",
        uploadId,
        partNumber,
        expiresIn: 60,
      })
      const response = await put(url, bytes(4, fill))
      etags.push({ partNumber, etag: response.headers.get("etag")! })
    }
    const listed = await files.storage.listParts({
      key: "videos/clip.mp4",
      uploadId,
    })
    expect(listed?.map((part) => part.partNumber)).toEqual([1, 2])

    await files.storage.completeMultipart({
      key: "videos/clip.mp4",
      uploadId,
      parts: etags,
    })
    const written = await fs.readFile(path.join(directory, "videos/clip.mp4"))
    expect([...written]).toEqual([1, 1, 1, 1, 2, 2, 2, 2])
    expect(
      await files.storage.listParts({ key: "videos/clip.mp4", uploadId })
    ).toEqual([])
  })

  it("uses public URLs when configured", async () => {
    const publicFiles = createFileSystemStorage({
      directory,
      baseUrl: "/api/files",
      secret: "s",
      publicUrl: "/uploads/",
    })
    expect(await publicFiles.storage.getUrl("a b/c.png")).toBe(
      "/uploads/a%20b/c.png"
    )
  })
})

describe("signCloudinaryParams", () => {
  it("matches Cloudinary's documented example", async () => {
    const result = await signCloudinaryParams(
      {
        eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
        public_id: "sample_image",
      },
      { apiKey: "key", apiSecret: "abcd", timestamp: 1315060510 }
    )
    expect(result.signature).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e")
    expect(result.timestamp).toBe(1315060510)
  })
})
