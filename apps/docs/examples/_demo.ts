"use client"

/**
 * Demo helpers for the docs: a simulated adapter and sample files, so
 * previews show real upload states without you dropping anything.
 * In your app, use a real adapter (e.g. `s3Adapter`) instead.
 */
import * as React from "react"
import {
  abortError,
  MiB,
  mockAdapter,
  type Transport,
  UploadError,
  type Uploader,
  xhrTransport,
} from "@uploadcn/core"

/** Simulated network: ~0.6 MB/s, and files named "corrupt…" fail. */
export const demoAdapter = mockAdapter({
  speed: 0.6 * MiB,
  latency: 300,
  fail: ({ file }) =>
    file.name.startsWith("corrupt")
      ? new UploadError("Connection reset while uploading", {
          code: "http",
          status: 500,
        })
      : null,
})

/** Where the docs' in-memory demo storage points signed URLs. */
const DEMO_BUCKET = "/api/storage"

/**
 * The docs' upload route signs real requests. Without cloud credentials
 * there is no bucket behind it, so this transport plays the bucket in the
 * browser: progress, ETag and all, without sending the bytes anywhere. With
 * S3 or R2 configured, requests go to the real bucket as usual. In your app,
 * leave `transport` out.
 */
export const demoTransport: Transport = (request) => {
  const url = new URL(request.url, window.location.href)
  if (url.origin !== window.location.origin || url.pathname !== DEMO_BUCKET) {
    return xhrTransport(request)
  }
  const size = request.body instanceof Blob ? request.body.size : 0
  const speed = 2.5 * MiB
  return new Promise((resolve, reject) => {
    const { signal } = request
    if (signal?.aborted) return reject(abortError(signal.reason))
    const started = performance.now() + 150
    const timer = setInterval(() => {
      const elapsed = Math.max(0, performance.now() - started) / 1000
      const loaded = Math.min(size, Math.round(elapsed * speed))
      request.onUploadProgress?.(loaded, size)
      if (loaded >= size) {
        clearInterval(timer)
        signal?.removeEventListener("abort", onAbort)
        resolve({
          status: 200,
          headers: new Headers({ etag: `"${size}-demo"` }),
          body: "",
        })
      }
    }, 100)
    const onAbort = () => {
      clearInterval(timer)
      reject(abortError(signal?.reason))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

/**
 * Stands in for your backend's work after an upload (a virus scan, document
 * ingestion), so examples can show those states. In your app this is a
 * queue worker, a webhook from your scanner, or polling your API.
 */
export async function simulateBackendStep(
  name: string,
  step: string,
  signal: AbortSignal
) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 500 + Math.random() * 700)
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(abortError(signal.reason))
      },
      { once: true }
    )
  })
  // Scanners are tested with names like "eicar", never with real malware.
  if (step === "scan" && /eicar|virus|malware/i.test(name)) return "infected"
  return "clean"
}

const PALETTES = [
  ["#0f172a", "#f59e0b", "#f8fafc"],
  ["#14532d", "#86efac", "#f0fdf4"],
  ["#1e1b4b", "#a5b4fc", "#eef2ff"],
  ["#7c2d12", "#fdba74", "#fff7ed"],
]

/** Draws a small abstract "photo" so image previews have something to show. */
async function sampleImage(name: string, palette: string[]) {
  const canvas = document.createElement("canvas")
  canvas.width = 480
  canvas.height = 360
  const context = canvas.getContext("2d")!
  context.fillStyle = palette[0]!
  context.fillRect(0, 0, 480, 360)
  context.fillStyle = palette[1]!
  context.beginPath()
  context.arc(330, 120, 70, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = palette[2]!
  context.beginPath()
  context.moveTo(0, 360)
  context.lineTo(160, 190)
  context.lineTo(280, 290)
  context.lineTo(380, 220)
  context.lineTo(480, 320)
  context.lineTo(480, 360)
  context.fill()
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((value) => resolve(value!), "image/png")
  )
  return new File([blob], name, { type: "image/png" })
}

function sampleBytes(name: string, size: number, type: string) {
  return new File([new Uint8Array(size)], name, { type })
}

export type SampleSet =
  | "mixed"
  | "images"
  | "documents"
  | "audio"
  | "artifacts"
  | "drawings"
  | "shipping"
  | "contracts"

/** Named files of a given size, for sets that don't need real content. */
const NAMED: Partial<Record<SampleSet, [string, number, string][]>> = {
  audio: [
    ["01 Morning Light.mp3", 6.4, "audio/mpeg"],
    ["02 City Lines.mp3", 5.1, "audio/mpeg"],
    ["03 Night Drive.flac", 9.8, "audio/flac"],
  ],
  artifacts: [
    ["web-build-2.14.0.zip", 7.5, "application/zip"],
    ["server-bundle.tar.gz", 4.2, "application/gzip"],
    ["sourcemaps.zip", 2.1, "application/zip"],
  ],
  drawings: [
    ["A-104-north-elevation.pdf", 3.6, "application/pdf"],
    ["A-105-floor-plan.dwg", 5.2, "application/acad"],
  ],
  contracts: [
    ["nda-acme-signed.pdf", 0.6, "application/pdf"],
    ["employment-agreement.docx", 0.9, "application/msword"],
    ["lease-renewal-2027.pdf", 1.8, "application/pdf"],
  ],
  shipping: [
    ["manifest-PO-4471.pdf", 1.6, "application/pdf"],
    ["commercial-invoice.pdf", 0.9, "application/pdf"],
    ["proof-of-delivery.jpg", 2.4, "image/jpeg"],
  ],
}

export async function createSampleFiles(set: SampleSet = "mixed") {
  const named = NAMED[set]
  if (named) {
    return named.map(([name, megabytes, type]) =>
      sampleBytes(name, megabytes * MiB, type)
    )
  }
  if (set === "images") {
    return Promise.all([
      sampleImage("mountains.png", PALETTES[0]!),
      sampleImage("forest-trail.png", PALETTES[1]!),
      sampleImage("night-sky.png", PALETTES[2]!),
      sampleImage("desert-dunes.png", PALETTES[3]!),
    ])
  }
  if (set === "documents") {
    return [
      sampleBytes("q3-board-deck.pdf", 3.2 * MiB, "application/pdf"),
      sampleBytes("contract-v2.docx", 0.8 * MiB, "application/msword"),
      sampleBytes("corrupt-export.csv", 1.4 * MiB, "text/csv"),
    ]
  }
  return [
    await sampleImage("cover-photo.png", PALETTES[2]!),
    sampleBytes("design-review.pdf", 6 * MiB, "application/pdf"),
    sampleBytes("corrupt-archive.zip", 2 * MiB, "application/zip"),
  ]
}

const seeded = new WeakSet<object>()

/** Adds sample files once, when the uploader is empty. */
export function useSampleFiles<TResult>(
  uploader: Uploader<TResult>,
  set: SampleSet = "mixed"
) {
  React.useEffect(() => {
    if (seeded.has(uploader)) return
    seeded.add(uploader)
    let cancelled = false
    void createSampleFiles(set).then((files) => {
      if (!cancelled && uploader.getState().items.length === 0) {
        void uploader.add(files)
      }
    })
    return () => {
      cancelled = true
      seeded.delete(uploader)
    }
  }, [uploader, set])
}
