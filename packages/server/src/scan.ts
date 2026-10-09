import type { Socket } from "node:net"

import type { FileDescriptor } from "@uploadcn/core"

/** The verdict of a virus scan. */
export interface ScanResult {
  /**
   * `clean`: no threats found. `infected`: at least one threat. `unknown`:
   * the scanner couldn't decide (file too large, unknown hash, outage…).
   */
  status: "clean" | "infected" | "unknown"
  /** Threat names, e.g. `["Win.Test.EICAR_HDB-1"]`. */
  threats: string[]
  /** Which scanner produced the verdict. */
  scanner: string
  /** Scanner-specific data, for logs. Never sent to the browser. */
  details?: unknown
}

export interface ScanInput {
  /** The file's bytes. Read it once. */
  stream: ReadableStream<Uint8Array>
  file: FileDescriptor
  /** The storage key, when scanning a stored upload. */
  key?: string
  signal?: AbortSignal
}

/** Anything that can scan a file: ClamAV, VirusTotal, your own service. */
export interface Scanner {
  readonly name: string
  scan(input: ScanInput): Promise<ScanResult>
}

export class ScanError extends Error {
  override readonly name = "ScanError"
}

/** Builds a scanner from a function, for services without a built-in one. */
export function createScanner(
  name: string,
  scan: (input: ScanInput) => Promise<Omit<ScanResult, "scanner">>
): Scanner {
  return {
    name,
    async scan(input) {
      return { ...(await scan(input)), scanner: name }
    },
  }
}

/** Reads a stream into memory, failing past `limit` bytes. */
export async function readStream(
  stream: ReadableStream<Uint8Array>,
  limit = Number.POSITIVE_INFINITY
) {
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new ScanError(`File is larger than ${limit} bytes`)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

// ---------------------------------------------------------------------------
// ClamAV

export interface ClamAvOptions {
  /** clamd host. Default `"127.0.0.1"`. */
  host?: string
  /** clamd TCP port. Default `3310`. */
  port?: number
  /** Unix socket path, instead of host and port. */
  socketPath?: string
  /** Milliseconds before giving up. Default 60 000. */
  timeout?: number
  /** Bytes per INSTREAM chunk. Default 64 KiB. */
  chunkSize?: number
}

/**
 * Scans files with ClamAV, streaming them to `clamd` over the INSTREAM
 * protocol. Files are never written to disk. Runs on Node.js (it opens a
 * TCP or Unix socket), not on edge runtimes.
 *
 * clamd rejects streams larger than its `StreamMaxLength` (25 MB by
 * default); raise it in `clamd.conf` for bigger files.
 */
export function clamavScanner(options: ClamAvOptions = {}) {
  const timeout = options.timeout ?? 60_000
  const chunkSize = options.chunkSize ?? 64 * 1024

  async function connect(signal?: AbortSignal) {
    const net = await import("node:net")
    const socket = options.socketPath
      ? net.createConnection(options.socketPath)
      : net.createConnection({
          host: options.host ?? "127.0.0.1",
          port: options.port ?? 3310,
        })
    return { socket, reply: collectReply(socket, timeout, signal) }
  }

  const scanner = {
    name: "clamav",
    async scan({ stream, signal }: ScanInput): Promise<ScanResult> {
      const { socket, reply } = await connect(signal)
      const write = async () => {
        await new Promise<void>((resolve, reject) => {
          socket.once("connect", resolve)
          socket.once("error", reject)
        })
        socket.write("zINSTREAM\0")
        const reader = stream.getReader()
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            for (let at = 0; at < value.byteLength; at += chunkSize) {
              if (socket.destroyed) return
              const slice = value.subarray(at, at + chunkSize)
              const length = new Uint8Array(4)
              new DataView(length.buffer).setUint32(0, slice.byteLength)
              socket.write(length)
              if (!socket.write(slice)) {
                await new Promise((resolve) => socket.once("drain", resolve))
              }
            }
          }
          // A zero-length chunk ends the stream.
          socket.write(new Uint8Array(4))
        } finally {
          reader.releaseLock()
        }
      }
      write().catch(() => {
        // Write errors surface through `reply` (clamd closes early when the
        // stream is too large, and its reply explains why).
      })
      return parseClamReply(await reply)
    },
    /** Checks that clamd is reachable. Resolves `true` on PONG. */
    async ping() {
      const { socket, reply } = await connect()
      socket.write("zPING\0")
      return (await reply).trim() === "PONG"
    },
  }
  return scanner
}

function collectReply(socket: Socket, timeout: number, signal?: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let settled = false
    const decode = () =>
      new TextDecoder()
        .decode(
          chunks.length === 1
            ? chunks[0]
            : Uint8Array.from(chunks.flatMap((chunk) => [...chunk]))
        )
        .replace(/\0/g, "")
        .trim()
    const finish = (error?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      socket.destroy()
      // If clamd answered before the socket failed, its answer wins.
      if (chunks.length) resolve(decode())
      else reject(error ?? new ScanError("ClamAV closed the connection"))
    }
    const timer = setTimeout(
      () => finish(new ScanError("ClamAV timed out")),
      timeout
    )
    const onAbort = () => finish(signal?.reason)
    signal?.addEventListener("abort", onAbort, { once: true })
    socket.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk)
      if (chunk.includes(0)) finish()
    })
    socket.on("end", () => finish())
    socket.on("close", () => finish())
    socket.on("error", (error) =>
      finish(new ScanError(`ClamAV: ${error.message}`))
    )
  })
}

/** Parses a clamd reply such as `stream: Eicar-Signature FOUND`. */
export function parseClamReply(reply: string): ScanResult {
  if (/^stream: OK$/.test(reply)) {
    return { status: "clean", threats: [], scanner: "clamav" }
  }
  const found = reply.match(/^stream: (.+) FOUND$/)
  if (found) {
    return { status: "infected", threats: [found[1]!], scanner: "clamav" }
  }
  throw new ScanError(`ClamAV: ${reply || "empty reply"}`)
}

// ---------------------------------------------------------------------------
// VirusTotal

export interface VirusTotalOptions {
  /** Your VirusTotal API key. Read it from an environment variable. */
  apiKey: string
  /**
   * Upload files VirusTotal hasn't seen. Default `false`: only the SHA-256
   * is sent and unknown files are `unknown`.
   *
   * Uploaded files are shared with VirusTotal's security partners. Never
   * enable this for private documents.
   */
  upload?: boolean
  /** Engines that must flag a file to call it infected. Default 2. */
  threshold?: number
  /** Milliseconds between analysis polls. Default 5 000. */
  pollInterval?: number
  /** Milliseconds to wait for an analysis. Default 120 000. */
  timeout?: number
  /** Largest file to read, in bytes. Default 650 MB (VirusTotal's limit). */
  maxFileSize?: number
  fetch?: typeof fetch
}

const VT = "https://www.virustotal.com/api/v3"

interface VtStats {
  malicious?: number
  suspicious?: number
  undetected?: number
  harmless?: number
}

type VtResults = Record<string, { category?: string; result?: string | null }>

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Checks files against VirusTotal's 70+ engines. By default it looks up the
 * file's hash only, so file contents never leave your server.
 */
export function virusTotalScanner(options: VirusTotalOptions): Scanner {
  const fetcher = options.fetch ?? fetch
  const threshold = options.threshold ?? 2
  const headers = { "x-apikey": options.apiKey, accept: "application/json" }

  const verdict = (
    stats: VtStats,
    results: VtResults = {},
    details?: unknown
  ): ScanResult => {
    const flagged = (stats.malicious ?? 0) + (stats.suspicious ?? 0)
    const analysed = flagged + (stats.undetected ?? 0) + (stats.harmless ?? 0)
    const threats = Object.entries(results)
      .filter(([, value]) => value.category === "malicious")
      .map(([engine, value]) => `${engine}: ${value.result ?? "malicious"}`)
    return {
      status:
        analysed === 0
          ? "unknown"
          : flagged >= threshold
            ? "infected"
            : "clean",
      threats,
      scanner: "virustotal",
      details,
    }
  }

  const request = async (url: string, init: RequestInit = {}) => {
    const response = await fetcher(url, {
      ...init,
      headers: { ...headers, ...init.headers },
    })
    if (response.status === 404) return null
    if (!response.ok) {
      throw new ScanError(`VirusTotal answered ${response.status}`)
    }
    return (await response.json()) as {
      data?: { id?: string; attributes?: Record<string, unknown> }
    }
  }

  return {
    name: "virustotal",
    async scan({ stream, file, signal }) {
      const bytes = await readStream(
        stream,
        options.maxFileSize ?? 650 * 1024 ** 2
      )
      const hash = await sha256(bytes)
      const known = await request(`${VT}/files/${hash}`, { signal })
      if (known?.data?.attributes) {
        const attributes = known.data.attributes
        return verdict(
          attributes.last_analysis_stats as VtStats,
          attributes.last_analysis_results as VtResults,
          { sha256: hash }
        )
      }
      if (!options.upload) {
        return {
          status: "unknown",
          threats: [],
          scanner: "virustotal",
          details: { sha256: hash },
        }
      }

      // Files over 32 MB need a one-time upload URL.
      let uploadUrl = `${VT}/files`
      if (bytes.byteLength > 32 * 1024 ** 2) {
        const response = await fetcher(`${VT}/files/upload_url`, {
          headers,
          signal,
        })
        if (!response.ok)
          throw new ScanError(`VirusTotal answered ${response.status}`)
        uploadUrl = ((await response.json()) as { data: string }).data
        if (!uploadUrl.startsWith("https://www.virustotal.com/")) {
          throw new ScanError("Unexpected VirusTotal upload URL")
        }
      }
      const form = new FormData()
      form.append(
        "file",
        new Blob([bytes as BlobPart], { type: file.type }),
        file.name
      )
      const uploaded = await request(uploadUrl, {
        method: "POST",
        body: form,
        signal,
      })
      const analysis = uploaded?.data?.id
      if (!analysis)
        throw new ScanError("VirusTotal didn't return an analysis id")

      const deadline = Date.now() + (options.timeout ?? 120_000)
      while (Date.now() < deadline) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.pollInterval ?? 5_000)
        )
        signal?.throwIfAborted()
        const result = await request(
          `${VT}/analyses/${encodeURIComponent(analysis)}`,
          { signal }
        )
        const attributes = result?.data?.attributes
        if (attributes?.status === "completed") {
          return verdict(
            attributes.stats as VtStats,
            attributes.results as VtResults,
            {
              sha256: hash,
              analysis,
            }
          )
        }
      }
      return {
        status: "unknown",
        threats: [],
        scanner: "virustotal",
        details: { sha256: hash, analysis, timedOut: true },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Any HTTP scanning service

export interface HttpScannerOptions {
  /** Endpoint that receives the file bytes as the request body. */
  url: string
  /** Extra headers, e.g. an API key from an environment variable. */
  headers?: Record<string, string>
  /**
   * Maps the service's response to a verdict. By default the response must
   * be JSON like `{ "status": "clean" | "infected", "threats": [] }`, or
   * `{ "clean": true }`.
   */
  parse?: (body: unknown, response: Response) => Omit<ScanResult, "scanner">
  /** Name used in results and logs. Default `"http"`. */
  name?: string
  fetch?: typeof fetch
}

function defaultParse(body: unknown): Omit<ScanResult, "scanner"> {
  if (typeof body !== "object" || body === null) {
    throw new ScanError("Scanner returned an unexpected response")
  }
  const value = body as { status?: unknown; clean?: unknown; threats?: unknown }
  const threats = Array.isArray(value.threats) ? value.threats.map(String) : []
  if (
    value.status === "clean" ||
    value.status === "infected" ||
    value.status === "unknown"
  ) {
    return { status: value.status, threats }
  }
  if (typeof value.clean === "boolean") {
    return { status: value.clean ? "clean" : "infected", threats }
  }
  throw new ScanError("Scanner returned an unexpected response")
}

/**
 * Sends files to your own scanning service, or a hosted one such as
 * Cloudmersive, MetaDefender or an internal sandbox. The body is the raw
 * file; `x-file-name` and `content-type` describe it.
 */
export function httpScanner(options: HttpScannerOptions): Scanner {
  const name = options.name ?? "http"
  return {
    name,
    async scan({ stream, file, signal }) {
      const bytes = await readStream(stream)
      const response = await (options.fetch ?? fetch)(options.url, {
        method: "POST",
        headers: {
          "content-type": file.type || "application/octet-stream",
          "x-file-name": encodeURIComponent(file.name),
          ...options.headers,
        },
        body: bytes as BodyInit,
        signal,
      })
      if (!response.ok)
        throw new ScanError(`${name} answered ${response.status}`)
      const text = await response.text()
      let body: unknown = text
      try {
        body = JSON.parse(text)
      } catch {
        // Some services answer in plain text; `parse` handles those.
      }
      return {
        ...(options.parse ?? defaultParse)(body, response),
        scanner: name,
      }
    },
  }
}
