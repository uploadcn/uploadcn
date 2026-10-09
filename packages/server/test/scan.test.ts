import { createServer, type Server } from "node:net"

import { type Transport, createUploader, s3Adapter } from "@uploadcn/core"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createUploadRoute, type UploadStorage } from "../src"
import {
  ScanError,
  clamavScanner,
  createScanner,
  httpScanner,
  parseClamReply,
  readStream,
  virusTotalScanner,
  type Scanner,
} from "../src/scan"

const ORIGIN = "http://localhost"
// Built at runtime so this file itself never looks like a test virus.
const EICAR = [
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$",
  "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
].join("")

const streamOf = (text: string, chunk = 7) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const bytes = new TextEncoder().encode(text)
      for (let at = 0; at < bytes.length; at += chunk) {
        controller.enqueue(bytes.slice(at, at + chunk))
      }
      controller.close()
    },
  })

const FILE = { name: "report.pdf", type: "application/pdf", size: 10 }

/** A fake clamd that speaks INSTREAM and flags the EICAR string. */
async function fakeClamd(options: { reply?: (body: string) => string } = {}) {
  const received: string[] = []
  const server: Server = createServer((socket) => {
    let buffer = Buffer.alloc(0)
    let command: string | undefined
    const body: Buffer[] = []
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk])
      if (!command) {
        const end = buffer.indexOf(0)
        if (end === -1) return
        command = buffer.subarray(0, end).toString()
        buffer = buffer.subarray(end + 1)
        received.push(command)
        if (command === "zPING") {
          socket.end("PONG\0")
          return
        }
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0)
        if (length === 0) {
          const text = Buffer.concat(body).toString()
          const reply =
            options.reply?.(text) ??
            (text.includes(EICAR)
              ? "stream: Win.Test.EICAR_HDB-1 FOUND"
              : "stream: OK")
          socket.end(`${reply}\0`)
          return
        }
        if (buffer.length < 4 + length) return
        body.push(buffer.subarray(4, 4 + length))
        buffer = buffer.subarray(4 + length)
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  const port = typeof address === "object" && address ? address.port : 0
  return {
    port,
    received,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

describe("clamavScanner", () => {
  let close: (() => Promise<unknown>) | undefined
  afterEach(async () => {
    await close?.()
    close = undefined
  })

  it("streams files to clamd and reports clean files", async () => {
    const clamd = await fakeClamd()
    close = clamd.close
    const scanner = clamavScanner({ port: clamd.port, chunkSize: 5 })
    const result = await scanner.scan({
      stream: streamOf("hello world"),
      file: FILE,
    })
    expect(result).toEqual({ status: "clean", threats: [], scanner: "clamav" })
    expect(clamd.received).toEqual(["zINSTREAM"])
  })

  it("reports infected files with the threat name", async () => {
    const clamd = await fakeClamd()
    close = clamd.close
    const result = await clamavScanner({ port: clamd.port }).scan({
      stream: streamOf(`prefix ${EICAR} suffix`),
      file: FILE,
    })
    expect(result.status).toBe("infected")
    expect(result.threats).toEqual(["Win.Test.EICAR_HDB-1"])
  })

  it("surfaces clamd errors such as size limits", async () => {
    const clamd = await fakeClamd({
      reply: () => "INSTREAM size limit exceeded. ERROR",
    })
    close = clamd.close
    await expect(
      clamavScanner({ port: clamd.port }).scan({
        stream: streamOf("x"),
        file: FILE,
      })
    ).rejects.toThrow(/size limit/)
  })

  it("answers ping", async () => {
    const clamd = await fakeClamd()
    close = clamd.close
    await expect(clamavScanner({ port: clamd.port }).ping()).resolves.toBe(true)
  })

  it("fails when clamd is unreachable", async () => {
    const clamd = await fakeClamd()
    await clamd.close()
    await expect(
      clamavScanner({ port: clamd.port, timeout: 2000 }).scan({
        stream: streamOf("x"),
        file: FILE,
      })
    ).rejects.toBeInstanceOf(ScanError)
  })

  it("parses replies strictly", () => {
    expect(parseClamReply("stream: OK").status).toBe("clean")
    expect(() => parseClamReply("garbage")).toThrow(ScanError)
  })
})

describe("virusTotalScanner", () => {
  const analysis = (malicious: number) => ({
    data: {
      attributes: {
        last_analysis_stats: {
          malicious,
          suspicious: 0,
          undetected: 60,
          harmless: 0,
        },
        last_analysis_results: {
          EngineA: {
            category: malicious ? "malicious" : "undetected",
            result: malicious ? "EICAR" : null,
          },
        },
      },
    },
  })

  it("looks up the SHA-256 only and never uploads by default", async () => {
    const fetch = vi.fn(async () => Response.json(analysis(0)))
    const result = await virusTotalScanner({ apiKey: "key", fetch }).scan({
      stream: streamOf("abc"),
      file: FILE,
    })
    expect(result.status).toBe("clean")
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    // sha256("abc")
    expect(url).toBe(
      "https://www.virustotal.com/api/v3/files/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
    expect((init.headers as Record<string, string>)["x-apikey"]).toBe("key")
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("applies the engine threshold", async () => {
    const fetch = vi.fn(async () => Response.json(analysis(1)))
    const scan = (threshold: number) =>
      virusTotalScanner({ apiKey: "key", fetch, threshold }).scan({
        stream: streamOf("abc"),
        file: FILE,
      })
    expect((await scan(2)).status).toBe("clean")
    const flagged = await scan(1)
    expect(flagged.status).toBe("infected")
    expect(flagged.threats).toEqual(["EngineA: EICAR"])
  })

  it("reports unknown files as unknown without uploading", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 404 }))
    const result = await virusTotalScanner({ apiKey: "key", fetch }).scan({
      stream: streamOf("abc"),
      file: FILE,
    })
    expect(result.status).toBe("unknown")
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("uploads unknown files when allowed and polls the analysis", async () => {
    const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("/files/") && !init?.method)
        return new Response("", { status: 404 })
      if (init?.method === "POST")
        return Response.json({ data: { id: "an-1" } })
      return Response.json({
        data: {
          attributes: {
            status: "completed",
            stats: { malicious: 3, undetected: 50 },
            results: {},
          },
        },
      })
    })
    const result = await virusTotalScanner({
      apiKey: "key",
      fetch,
      upload: true,
      pollInterval: 1,
    }).scan({
      stream: streamOf("abc"),
      file: FILE,
    })
    expect(result.status).toBe("infected")
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining("/files/ba78"),
      "https://www.virustotal.com/api/v3/files",
      "https://www.virustotal.com/api/v3/analyses/an-1",
    ])
  })

  it("throws on API errors", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 429 }))
    await expect(
      virusTotalScanner({ apiKey: "key", fetch }).scan({
        stream: streamOf("abc"),
        file: FILE,
      })
    ).rejects.toThrow(/429/)
  })
})

describe("httpScanner and createScanner", () => {
  it("posts the raw file and reads the default JSON shape", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = new TextDecoder().decode(init?.body as Uint8Array)
      return Response.json(
        body.includes("bad")
          ? { clean: false, threats: ["X"] }
          : { status: "clean" }
      )
    })
    const scanner = httpScanner({
      url: "https://scan.internal/v1",
      headers: { authorization: "Bearer t" },
      fetch,
    })
    expect(
      (await scanner.scan({ stream: streamOf("good"), file: FILE })).status
    ).toBe("clean")
    const bad = await scanner.scan({
      stream: streamOf("bad"),
      file: { ...FILE, name: "a b.pdf" },
    })
    expect(bad).toMatchObject({
      status: "infected",
      threats: ["X"],
      scanner: "http",
    })
    const init = fetch.mock.calls[1]![1]!
    expect((init.headers as Record<string, string>)["x-file-name"]).toBe(
      "a%20b.pdf"
    )
  })

  it("supports custom response parsing", async () => {
    const fetch = vi.fn(async () => new Response("RESULT: CLEAN"))
    const scanner = httpScanner({
      url: "https://scan.internal",
      name: "sandbox",
      fetch,
      parse: (body) => ({
        status: String(body).includes("CLEAN") ? "clean" : "infected",
        threats: [],
      }),
    })
    expect(
      await scanner.scan({ stream: streamOf("x"), file: FILE })
    ).toMatchObject({
      status: "clean",
      scanner: "sandbox",
    })
  })

  it("rejects unexpected responses", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true }))
    await expect(
      httpScanner({ url: "https://scan.internal", fetch }).scan({
        stream: streamOf("x"),
        file: FILE,
      })
    ).rejects.toThrow(ScanError)
  })

  it("wraps functions with createScanner", async () => {
    const scanner = createScanner("guardduty", async () => ({
      status: "clean",
      threats: [],
    }))
    expect(await scanner.scan({ stream: streamOf("x"), file: FILE })).toEqual({
      status: "clean",
      threats: [],
      scanner: "guardduty",
    })
  })

  it("readStream enforces a limit", async () => {
    await expect(readStream(streamOf("0123456789"), 5)).rejects.toThrow(
      ScanError
    )
    expect(
      new TextDecoder().decode(await readStream(streamOf("0123456789")))
    ).toBe("0123456789")
  })
})

/** Storage that keeps bytes in memory and can read them back. */
function byteStorage() {
  const objects = new Map<string, Uint8Array>()
  const storage: UploadStorage = {
    name: "bytes",
    async presignPut({ key }) {
      return { url: `${ORIGIN}/put/${key}`, headers: {} }
    },
    async createMultipart() {
      throw new Error("not used")
    },
    async presignPart() {
      throw new Error("not used")
    },
    async listParts() {
      return null
    },
    async completeMultipart() {
      throw new Error("not used")
    },
    async abortMultipart() {},
    async headObject(key) {
      const bytes = objects.get(key)
      return bytes ? { size: bytes.byteLength } : null
    },
    async deleteObject(key) {
      objects.delete(key)
    },
    async getObject(key) {
      const bytes = objects.get(key)
      return bytes ? new Blob([bytes as BlobPart]).stream() : null
    },
    async getUrl(key) {
      return `${ORIGIN}/files/${key}`
    },
  }
  return { storage, objects }
}

const eicarScanner: Scanner = createScanner("test", async ({ stream }) => {
  const text = new TextDecoder().decode(await readStream(stream))
  return text.includes(EICAR)
    ? { status: "infected", threats: ["EICAR"] }
    : { status: "clean", threats: [] }
})

function harness(
  scan: Parameters<typeof createUploadRoute>[0]["scan"],
  onUploadComplete = vi.fn()
) {
  const { storage, objects } = byteStorage()
  const route = createUploadRoute({ storage, scan, onUploadComplete })
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) =>
    route.POST(
      new Request(new URL(String(input), ORIGIN), init)
    )) as typeof fetch
  const transport: Transport = async (request) => {
    const body = request.body as Blob
    objects.set(
      new URL(request.url).pathname.replace("/put/", ""),
      new Uint8Array(await body.arrayBuffer())
    )
    request.onUploadProgress?.(body.size, body.size)
    return { status: 200, headers: new Headers({ etag: '"1"' }), body: "" }
  }
  const uploader = createUploader({
    adapter: s3Adapter({ endpoint: "/api/upload", fetch: fetcher, transport }),
    retry: false,
    network: false,
  })
  return { uploader, objects, onUploadComplete }
}

async function settle(uploader: ReturnType<typeof harness>["uploader"]) {
  await vi.waitFor(() => {
    const items = uploader.getState().items
    expect(
      items.every((item) =>
        ["success", "error", "rejected"].includes(item.status)
      )
    ).toBe(true)
  })
  return uploader.getState().items[0]!
}

describe("createUploadRoute with scan", () => {
  it("completes clean files and reports the verdict", async () => {
    const { uploader, objects, onUploadComplete } = harness({
      scanner: eicarScanner,
    })
    await uploader.add([
      new File(["hello"], "hello.txt", { type: "text/plain" }),
    ])
    const item = await settle(uploader)
    expect(item.status).toBe("success")
    expect(item.result).toMatchObject({
      scan: { status: "clean", scanner: "test" },
    })
    expect(objects.size).toBe(1)
    expect(onUploadComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        scan: expect.objectContaining({ status: "clean" }),
      })
    )
  })

  it("deletes infected files and the client sees them as rejected", async () => {
    const onResult = vi.fn()
    const { uploader, objects, onUploadComplete } = harness({
      scanner: eicarScanner,
      onResult,
    })
    await uploader.add([
      new File([EICAR], "eicar.com", { type: "application/octet-stream" }),
    ])
    const item = await settle(uploader)
    expect(item.status).toBe("rejected")
    expect(item.error?.message).toMatch(/malware/)
    expect(objects.size).toBe(0)
    expect(onUploadComplete).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({ status: "infected" }),
      })
    )
  })

  it("fails closed when the scanner is down, unless told otherwise", async () => {
    const broken = createScanner("broken", async () => {
      throw new Error("connection refused")
    })
    const closed = harness({ scanner: broken })
    await closed.uploader.add([new File(["x"], "a.txt")])
    expect((await settle(closed.uploader)).status).toBe("rejected")
    expect(closed.objects.size).toBe(0)

    const open = harness({ scanner: broken, onUnknown: "allow" })
    await open.uploader.add([new File(["x"], "a.txt")])
    const item = await settle(open.uploader)
    expect(item.status).toBe("success")
    expect(item.result).toMatchObject({ scan: { status: "unknown" } })
  })

  it("skips files over the scan limit as unknown", async () => {
    const scanner = { name: "spy", scan: vi.fn() }
    const { uploader } = harness({
      scanner,
      maxFileSize: 2,
      onUnknown: "allow",
    })
    await uploader.add([new File(["12345"], "big.txt")])
    expect((await settle(uploader)).status).toBe("success")
    expect(scanner.scan).not.toHaveBeenCalled()
  })

  it("refuses storages that can't read objects", () => {
    const { storage } = byteStorage()
    const { getObject: _, ...withoutRead } = storage
    expect(() =>
      createUploadRoute({
        storage: withoutRead,
        scan: { scanner: eicarScanner },
      })
    ).toThrow(/can't/)
  })
})
