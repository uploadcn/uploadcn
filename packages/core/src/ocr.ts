import { UploadError, abortError, httpError } from "./errors"
import { parseBody, resolveHeaders, type HeadersInput } from "./adapters/shared"
import type { ProcessContext, UploadItem } from "./types"

/** A line of recognized text. */
export interface OcrLine {
  text: string
  /** 0 to 1, when the engine reports it. */
  confidence?: number
}

export interface OcrPage {
  /** 1-based page number. */
  number: number
  text: string
  lines?: OcrLine[]
}

/** A key-value field from a document model (receipt, invoice, ID…). */
export interface OcrField {
  value: string
  /** 0 to 1, when the engine reports it. */
  confidence?: number
}

/**
 * What every OCR engine returns, whichever provider produced it: Google
 * Vision, AWS Textract, Azure Document Intelligence, Mistral, Tesseract or
 * your own backend.
 */
export interface OcrResult {
  /** All recognized text, pages separated by blank lines. */
  text: string
  pages: OcrPage[]
  /** Average confidence from 0 to 1, when the engine reports one. */
  confidence?: number
  /**
   * Structured fields from document models. Common receipt and invoice
   * fields use normalized names: `merchant`, `date`, `total`, `subtotal`,
   * `tax`, `currency`, `invoiceId`. Others keep the provider's name.
   */
  fields?: Record<string, OcrField>
  /** Markdown, from engines that produce it (Mistral OCR). */
  markdown?: string
  /** Which engine produced the result, e.g. `"google-vision"`. */
  provider: string
}

/** Reads text from a file. Every OCR helper returns one of these. */
export type OcrRecognizer = (
  file: File | Blob,
  context: { signal: AbortSignal }
) => Promise<OcrResult>

export interface OcrEndpointOptions {
  headers?: HeadersInput
  credentials?: RequestCredentials
  fetch?: typeof fetch
}

function isOcrResult(value: unknown): value is OcrResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as OcrResult).text === "string" &&
    Array.isArray((value as OcrResult).pages)
  )
}

/**
 * Sends the file to your OCR route (`createOcrRoute` from
 * `@uploadcn/server/ocr`, or any endpoint that accepts `multipart/form-data`
 * with a `file` field and answers with an {@link OcrResult}). API keys stay
 * on the server.
 *
 * @example
 * <OcrUpload recognize={ocrEndpoint("/api/ocr")} />
 */
export function ocrEndpoint(
  url: string,
  options: OcrEndpointOptions = {}
): OcrRecognizer {
  return async (file, { signal }) => {
    const body = new FormData()
    body.append("file", file, file instanceof File ? file.name : "file")
    const response = await (options.fetch ?? fetch)(url, {
      method: "POST",
      body,
      signal,
      credentials: options.credentials,
      headers: await resolveHeaders(options.headers),
    })
    const text = await response.text()
    const parsed = parseBody(text)
    if (!response.ok) {
      const message =
        parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : `Text recognition failed (${response.status})`
      throw httpError(response.status, { body: text, message })
    }
    if (!isOcrResult(parsed)) {
      throw new UploadError(
        "The OCR endpoint returned an unexpected response",
        {
          code: "http",
          status: response.status,
          details: text,
        }
      )
    }
    return parsed
  }
}

/** The part of `tesseract.js` that {@link tesseractOcr} uses. */
export interface TesseractModule {
  createWorker(
    langs?: string | string[],
    oem?: number,
    options?: Record<string, unknown>
  ): Promise<{
    recognize(image: Blob): Promise<{
      data: { text: string; confidence: number }
    }>
    terminate(): Promise<unknown>
  }>
}

export interface TesseractOcrOptions {
  /** Loads tesseract.js, e.g. `() => import("tesseract.js")`. */
  load: () => Promise<TesseractModule | { default: TesseractModule }>
  /** Languages, e.g. `"eng"` or `["eng", "deu"]`. Default `"eng"`. */
  lang?: string | string[]
  /** Passed to `createWorker`, e.g. self-hosted `workerPath` and `langPath`. */
  workerOptions?: Record<string, unknown>
}

/**
 * OCR in the browser with Tesseract: no server, no API key, files never
 * leave the device. Install `tesseract.js` yourself; it loads on first use.
 * Images only (PNG, JPEG, WebP, BMP); use a server provider for PDFs.
 */
export function tesseractOcr(
  options: TesseractOcrOptions
): OcrRecognizer & { terminate(): Promise<void> } {
  type Worker = Awaited<ReturnType<TesseractModule["createWorker"]>>
  let worker: Promise<Worker> | undefined
  // One recognition at a time per worker.
  let queue: Promise<unknown> = Promise.resolve()

  const getWorker = () =>
    (worker ??= options.load().then((loaded) => {
      const module = "default" in loaded ? loaded.default : loaded
      return module.createWorker(
        options.lang ?? "eng",
        undefined,
        options.workerOptions
      )
    }))

  const recognize = async (
    file: File | Blob,
    { signal }: { signal: AbortSignal }
  ) => {
    if (signal.aborted) throw abortError(signal.reason)
    const run = queue.then(async () => {
      const { data } = await (await getWorker()).recognize(file)
      return data
    })
    queue = run.catch(() => undefined)
    const data = await new Promise<{ text: string; confidence: number }>(
      (resolve, reject) => {
        const onAbort = () => reject(abortError(signal.reason))
        signal.addEventListener("abort", onAbort, { once: true })
        run
          .then(resolve, reject)
          .finally(() => signal.removeEventListener("abort", onAbort))
      }
    )
    const text = data.text.trim()
    const confidence = data.confidence / 100
    return {
      text,
      pages: [
        {
          number: 1,
          text,
          lines: text
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => ({ text: line })),
        },
      ],
      confidence,
      provider: "tesseract",
    } satisfies OcrResult
  }

  return Object.assign(recognize, {
    async terminate() {
      const current = worker
      worker = undefined
      if (current) await (await current).terminate()
    },
  })
}

export interface OcrProcessOptions {
  /** Only read files that match. Default: images and PDFs. */
  filter?: (file: File) => boolean
  /** Reject the upload when recognition fails. Default `false`. */
  required?: boolean
}

const READABLE = /^(image\/(png|jpe?g|webp|tiff|bmp|gif)|application\/pdf)$/

/**
 * Turns a recognizer into an uploader `process` step: after a file is
 * stored, its text is read and saved on `item.meta.ocr`. Works with any
 * adapter, so OCR is independent of where files go.
 *
 * @example
 * <Upload adapter={adapter} process={ocrProcess(ocrEndpoint("/api/ocr"))} />
 */
export function ocrProcess(
  recognize: OcrRecognizer,
  options: OcrProcessOptions = {}
) {
  const filter = options.filter ?? ((file: File) => READABLE.test(file.type))
  return async <TResult>(
    item: UploadItem<TResult>,
    context: ProcessContext<TResult>
  ): Promise<void> => {
    if (!filter(item.file)) return
    context.setStatus("processing")
    try {
      const ocr = await recognize(item.file, { signal: context.signal })
      context.setMeta({ ocr })
    } catch (error) {
      if (context.signal.aborted) throw error
      if (options.required) {
        throw new UploadError(
          error instanceof Error ? error.message : "Couldn't read the text",
          { code: "rejected", cause: error }
        )
      }
      context.setMeta({
        ocrError: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
