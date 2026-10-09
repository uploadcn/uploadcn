import {
  type FileDescriptor,
  type OcrField,
  type OcrLine,
  type OcrPage,
  type OcrResult,
  matchesAccept,
} from "@uploadcn/core"
import { AwsClient } from "aws4fetch"

import { readStream } from "./scan"
import type { UploadStorage } from "./storage"

export type { OcrField, OcrLine, OcrPage, OcrResult } from "@uploadcn/core"

export interface OcrInput {
  data: Uint8Array
  /** MIME type, e.g. `image/png` or `application/pdf`. */
  type: string
  name?: string
  signal?: AbortSignal
}

/** A server-side OCR engine. */
export interface OcrProvider {
  readonly name: string
  recognize(input: OcrInput): Promise<OcrResult>
}

export class OcrError extends Error {
  override readonly name = "OcrError"
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
  }
}

/** Builds a provider from a function, for engines without a built-in one. */
export function createOcrProvider(
  name: string,
  recognize: (input: OcrInput) => Promise<Omit<OcrResult, "provider">>
): OcrProvider {
  return {
    name,
    async recognize(input) {
      return { ...(await recognize(input)), provider: name }
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers

/** Base64 without Node's Buffer, so providers run on edge runtimes too. */
export function toBase64(bytes: Uint8Array) {
  let binary = ""
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000))
  }
  return btoa(binary)
}

function average(values: (number | undefined)[]) {
  const known = values.filter((value): value is number => value != null)
  return known.length
    ? known.reduce((total, value) => total + value, 0) / known.length
    : undefined
}

function joinPages(pages: OcrPage[]) {
  return pages
    .map((page) => page.text.trim())
    .filter(Boolean)
    .join("\n\n")
}

const FIELD_NAMES: Record<string, string> = {
  // AWS Textract AnalyzeExpense
  VENDOR_NAME: "merchant",
  NAME: "merchant",
  INVOICE_RECEIPT_DATE: "date",
  TOTAL: "total",
  AMOUNT_DUE: "amountDue",
  SUBTOTAL: "subtotal",
  TAX: "tax",
  INVOICE_RECEIPT_ID: "invoiceId",
  // Azure Document Intelligence receipts and invoices
  MerchantName: "merchant",
  VendorName: "merchant",
  TransactionDate: "date",
  InvoiceDate: "date",
  Total: "total",
  InvoiceTotal: "total",
  AmountDue: "amountDue",
  Subtotal: "subtotal",
  SubTotal: "subtotal",
  TotalTax: "tax",
  InvoiceId: "invoiceId",
}

function addField(
  fields: Record<string, OcrField>,
  name: string,
  field: OcrField
) {
  const key = FIELD_NAMES[name] ?? name
  const current = fields[key]
  // Keep the most confident value when a document repeats a field.
  if (!current || (field.confidence ?? 0) > (current.confidence ?? 0)) {
    fields[key] = field
  }
}

async function readJson(response: Response, provider: string) {
  const text = await response.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = undefined
  }
  if (!response.ok) {
    const message =
      (body as { error?: { message?: string }; message?: string } | undefined)
        ?.error?.message ??
      (body as { message?: string } | undefined)?.message ??
      text.slice(0, 200)
    throw new OcrError(
      `${provider} answered ${response.status}: ${message}`,
      response.status
    )
  }
  return body
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true }
    )
  })

// ---------------------------------------------------------------------------
// Google Cloud Vision

export interface GoogleVisionOptions {
  /** API key restricted to the Vision API. Or use `accessToken`. */
  apiKey?: string
  /** OAuth access token (e.g. from a service account), instead of `apiKey`. */
  accessToken?: () => string | Promise<string>
  /** Language hints, e.g. `["en", "de"]`. */
  languageHints?: string[]
  fetch?: typeof fetch
}

interface VisionAnnotation {
  text?: string
  pages?: { confidence?: number }[]
}

/**
 * Google Cloud Vision `DOCUMENT_TEXT_DETECTION`. Images go through
 * `images:annotate`; PDFs and TIFFs through `files:annotate` (first 5 pages).
 */
export function googleVisionOcr(options: GoogleVisionOptions): OcrProvider {
  if (!options.apiKey && !options.accessToken) {
    throw new Error("[uploadcn] googleVisionOcr needs apiKey or accessToken")
  }
  const fetcher = options.fetch ?? fetch
  const imageContext = options.languageHints
    ? { languageHints: options.languageHints }
    : undefined

  const post = async (path: string, body: unknown, signal?: AbortSignal) => {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    }
    if (options.accessToken) {
      headers.authorization = `Bearer ${await options.accessToken()}`
    } else {
      headers["x-goog-api-key"] = options.apiKey!
    }
    const response = await fetcher(`https://vision.googleapis.com/v1/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    })
    return readJson(response, "Google Vision")
  }

  const toPage = (
    annotation: VisionAnnotation | undefined,
    number: number
  ): OcrPage => ({
    number,
    text: annotation?.text?.trim() ?? "",
    lines: (annotation?.text ?? "")
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => ({ text: line })),
  })

  return {
    name: "google-vision",
    async recognize({ data, type, signal }) {
      const features = [{ type: "DOCUMENT_TEXT_DETECTION" }]
      const content = toBase64(data)
      type Response = {
        error?: { message?: string }
        fullTextAnnotation?: VisionAnnotation
      }

      let annotations: VisionAnnotation[]
      if (
        type === "application/pdf" ||
        type === "image/tiff" ||
        type === "image/gif"
      ) {
        const body = (await post(
          "files:annotate",
          {
            requests: [
              {
                inputConfig: { content, mimeType: type },
                features,
                imageContext,
                pages: [1, 2, 3, 4, 5],
              },
            ],
          },
          signal
        )) as {
          responses?: { responses?: Response[]; error?: { message?: string } }[]
        }
        const file = body.responses?.[0]
        if (file?.error?.message)
          throw new OcrError(`Google Vision: ${file.error.message}`)
        annotations = (file?.responses ?? []).map(
          (page) => page.fullTextAnnotation ?? {}
        )
      } else {
        const body = (await post(
          "images:annotate",
          { requests: [{ image: { content }, features, imageContext }] },
          signal
        )) as { responses?: Response[] }
        const image = body.responses?.[0]
        if (image?.error?.message)
          throw new OcrError(`Google Vision: ${image.error.message}`)
        annotations = [image?.fullTextAnnotation ?? {}]
      }

      const pages = annotations.map((annotation, index) =>
        toPage(annotation, index + 1)
      )
      return {
        text: joinPages(pages),
        pages,
        confidence: average(
          annotations.flatMap(
            (annotation) =>
              annotation.pages?.map((page) => page.confidence) ?? []
          )
        ),
        provider: "google-vision",
      }
    },
  }
}

// ---------------------------------------------------------------------------
// AWS Textract

export interface TextractOptions {
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  /**
   * `"text"` (default): DetectDocumentText, lines of text.
   * `"expense"`: AnalyzeExpense, which also returns receipt and invoice
   * fields (merchant, date, total, tax…).
   */
  model?: "text" | "expense"
  fetch?: typeof fetch
}

interface TextractBlock {
  BlockType?: string
  Text?: string
  Confidence?: number
  Page?: number
}

/**
 * AWS Textract, signed with aws4fetch (no AWS SDK). Synchronous APIs accept
 * JPEG, PNG, TIFF and single-page PDFs up to 10 MB.
 */
export function awsTextractOcr(options: TextractOptions): OcrProvider {
  const client = new AwsClient({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    sessionToken: options.sessionToken,
    region: options.region,
    service: "textract",
  })
  const endpoint = `https://textract.${options.region}.amazonaws.com/`
  const model = options.model ?? "text"

  const call = async (target: string, body: unknown, signal?: AbortSignal) => {
    const request = await client.sign(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-amz-json-1.1",
        "x-amz-target": `Textract.${target}`,
      },
      body: JSON.stringify(body),
    })
    return readJson(
      await (options.fetch ?? fetch)(request, { signal }),
      "AWS Textract"
    )
  }

  const pagesFrom = (blocks: TextractBlock[]): OcrPage[] => {
    const byPage = new Map<number, OcrLine[]>()
    for (const block of blocks) {
      if (block.BlockType !== "LINE" || !block.Text) continue
      const page = block.Page ?? 1
      byPage.set(page, [
        ...(byPage.get(page) ?? []),
        {
          text: block.Text,
          confidence:
            block.Confidence != null ? block.Confidence / 100 : undefined,
        },
      ])
    }
    return [...byPage]
      .sort(([a], [b]) => a - b)
      .map(([number, lines]) => ({
        number,
        lines,
        text: lines.map((line) => line.text).join("\n"),
      }))
  }

  return {
    name: "aws-textract",
    async recognize({ data, signal }) {
      const Document = { Bytes: toBase64(data) }
      if (model === "expense") {
        const body = (await call("AnalyzeExpense", { Document }, signal)) as {
          ExpenseDocuments?: {
            Blocks?: TextractBlock[]
            SummaryFields?: {
              Type?: { Text?: string }
              LabelDetection?: { Text?: string }
              ValueDetection?: { Text?: string; Confidence?: number }
              Currency?: { Code?: string }
            }[]
          }[]
        }
        const documents = body.ExpenseDocuments ?? []
        const fields: Record<string, OcrField> = {}
        for (const document of documents) {
          for (const field of document.SummaryFields ?? []) {
            const name = field.Type?.Text
            const value = field.ValueDetection?.Text
            if (!name || !value || name === "OTHER") continue
            addField(fields, name, {
              value,
              confidence:
                field.ValueDetection?.Confidence != null
                  ? field.ValueDetection.Confidence / 100
                  : undefined,
            })
            if (field.Currency?.Code && !fields.currency) {
              fields.currency = { value: field.Currency.Code }
            }
          }
        }
        const pages = pagesFrom(
          documents.flatMap((document) => document.Blocks ?? [])
        )
        return {
          text: joinPages(pages),
          pages,
          confidence: average(
            pages.flatMap(
              (page) => page.lines?.map((line) => line.confidence) ?? []
            )
          ),
          fields,
          provider: "aws-textract",
        }
      }
      const body = (await call("DetectDocumentText", { Document }, signal)) as {
        Blocks?: TextractBlock[]
      }
      const pages = pagesFrom(body.Blocks ?? [])
      return {
        text: joinPages(pages),
        pages,
        confidence: average(
          pages.flatMap(
            (page) => page.lines?.map((line) => line.confidence) ?? []
          )
        ),
        provider: "aws-textract",
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Azure AI Document Intelligence

export interface AzureDocumentIntelligenceOptions {
  /** Resource endpoint, e.g. `https://my-resource.cognitiveservices.azure.com`. */
  endpoint: string
  apiKey: string
  /**
   * `"prebuilt-read"` (default) for text, `"prebuilt-receipt"`,
   * `"prebuilt-invoice"`, `"prebuilt-idDocument"`, `"prebuilt-layout"` or a
   * custom model id.
   */
  model?: string
  apiVersion?: string
  /** Milliseconds to wait for the analysis. Default 60 000. */
  timeout?: number
  fetch?: typeof fetch
}

interface AzureField {
  content?: string
  confidence?: number
  valueString?: string
  valueNumber?: number
  valueDate?: string
  valueCurrency?: { amount?: number; currencyCode?: string }
}

/** Azure AI Document Intelligence (formerly Form Recognizer). */
export function azureDocumentIntelligenceOcr(
  options: AzureDocumentIntelligenceOptions
): OcrProvider {
  const fetcher = options.fetch ?? fetch
  const base = options.endpoint.replace(/\/+$/, "")
  const origin = new URL(base).origin
  const model = options.model ?? "prebuilt-read"
  const version = options.apiVersion ?? "2024-11-30"
  const headers = { "ocp-apim-subscription-key": options.apiKey }

  return {
    name: "azure-document-intelligence",
    async recognize({ data, signal }) {
      const response = await fetcher(
        `${base}/documentintelligence/documentModels/${encodeURIComponent(model)}:analyze?api-version=${version}`,
        {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ base64Source: toBase64(data) }),
          signal,
        }
      )
      if (response.status !== 202) {
        await readJson(response, "Azure Document Intelligence")
        throw new OcrError(
          `Azure Document Intelligence answered ${response.status}`
        )
      }
      const location = response.headers.get("operation-location")
      // Only follow the poll URL on the resource's own origin; the API key
      // is sent with it.
      if (!location || new URL(location).origin !== origin) {
        throw new OcrError(
          "Azure Document Intelligence returned an unexpected operation URL"
        )
      }

      const deadline = Date.now() + (options.timeout ?? 60_000)
      let delay = 1000
      while (Date.now() < deadline) {
        await sleep(delay, signal)
        const poll = await fetcher(location, { headers, signal })
        const body = (await readJson(poll, "Azure Document Intelligence")) as {
          status?: string
          error?: { message?: string }
          analyzeResult?: {
            content?: string
            pages?: {
              pageNumber: number
              lines?: { content: string }[]
              words?: { confidence?: number }[]
            }[]
            documents?: { fields?: Record<string, AzureField> }[]
          }
        }
        if (body.status === "failed") {
          throw new OcrError(
            `Azure Document Intelligence: ${body.error?.message ?? "analysis failed"}`
          )
        }
        if (body.status !== "succeeded") {
          const retry = Number(poll.headers.get("retry-after"))
          delay =
            Number.isFinite(retry) && retry > 0
              ? retry * 1000
              : Math.min(delay * 1.5, 5000)
          continue
        }
        const result = body.analyzeResult ?? {}
        const pages: OcrPage[] = (result.pages ?? []).map((page) => {
          const lines = (page.lines ?? []).map((line) => ({
            text: line.content,
          }))
          return {
            number: page.pageNumber,
            lines,
            text: lines.map((line) => line.text).join("\n"),
          }
        })
        const fields: Record<string, OcrField> = {}
        for (const document of result.documents ?? []) {
          for (const [name, field] of Object.entries(document.fields ?? {})) {
            const value =
              field.valueCurrency?.amount != null
                ? String(field.valueCurrency.amount)
                : (field.valueDate ??
                  field.valueString ??
                  field.content ??
                  (field.valueNumber != null
                    ? String(field.valueNumber)
                    : undefined))
            if (value == null) continue
            addField(fields, name, { value, confidence: field.confidence })
            if (field.valueCurrency?.currencyCode && !fields.currency) {
              fields.currency = { value: field.valueCurrency.currencyCode }
            }
          }
        }
        return {
          text: result.content?.trim() ?? joinPages(pages),
          pages,
          confidence: average(
            (result.pages ?? []).flatMap(
              (page) => page.words?.map((word) => word.confidence) ?? []
            )
          ),
          ...(Object.keys(fields).length ? { fields } : {}),
          provider: "azure-document-intelligence",
        }
      }
      throw new OcrError("Azure Document Intelligence timed out")
    },
  }
}

// ---------------------------------------------------------------------------
// Mistral OCR

export interface MistralOcrOptions {
  apiKey: string
  /** Default `"mistral-ocr-latest"`. */
  model?: string
  fetch?: typeof fetch
}

/** Strips Markdown syntax for the plain `text` field. */
function markdownToText(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/^\|?\s*:?-{3,}.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Mistral OCR. Reads PDFs and images and returns Markdown that keeps
 * headings, lists and tables, which is ideal input for an LLM.
 */
export function mistralOcr(options: MistralOcrOptions): OcrProvider {
  return {
    name: "mistral",
    async recognize({ data, type, signal }) {
      const url = `data:${type};base64,${toBase64(data)}`
      const document =
        type === "application/pdf"
          ? { type: "document_url", document_url: url }
          : { type: "image_url", image_url: url }
      const response = await (options.fetch ?? fetch)(
        "https://api.mistral.ai/v1/ocr",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: options.model ?? "mistral-ocr-latest",
            document,
            include_image_base64: false,
          }),
          signal,
        }
      )
      const body = (await readJson(response, "Mistral OCR")) as {
        pages?: { index: number; markdown?: string }[]
      }
      const markdownPages = (body.pages ?? []).map(
        (page) => page.markdown ?? ""
      )
      const pages = markdownPages.map((markdown, index) => {
        const text = markdownToText(markdown)
        return {
          number: (body.pages?.[index]?.index ?? index) + 1,
          text,
          lines: text
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => ({ text: line })),
        }
      })
      return {
        text: joinPages(pages),
        pages,
        markdown: markdownPages.join("\n\n"),
        provider: "mistral",
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Your own OCR service

export interface HttpOcrOptions {
  /** Endpoint that receives `multipart/form-data` with a `file` field. */
  url: string
  headers?: Record<string, string>
  /** Maps the response to an {@link OcrResult}. Default: it already is one. */
  parse?: (body: unknown) => Omit<OcrResult, "provider">
  name?: string
  fetch?: typeof fetch
}

/**
 * Forwards files to your own OCR backend: a Python service running
 * PaddleOCR, docTR, EasyOCR or Tesseract, an internal model, or any other
 * HTTP API.
 */
export function httpOcr(options: HttpOcrOptions): OcrProvider {
  const name = options.name ?? "http"
  return {
    name,
    async recognize({ data, type, name: fileName, signal }) {
      const form = new FormData()
      form.append(
        "file",
        new Blob([data as BlobPart], { type }),
        fileName ?? "file"
      )
      const response = await (options.fetch ?? fetch)(options.url, {
        method: "POST",
        headers: options.headers,
        body: form,
        signal,
      })
      const body = await readJson(response, name)
      const parsed = options.parse
        ? options.parse(body)
        : (body as Omit<OcrResult, "provider">)
      if (typeof parsed?.text !== "string") {
        throw new OcrError(`${name} returned an unexpected response`)
      }
      const pages = Array.isArray(parsed.pages)
        ? parsed.pages
        : [{ number: 1, text: parsed.text }]
      return { ...parsed, pages, provider: name }
    },
  }
}

// ---------------------------------------------------------------------------
// The route

/** Raster images and PDFs. SVG is deliberately excluded (it can carry script). */
export const OCR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "image/gif",
  "image/bmp",
  "application/pdf",
] as const

export interface OcrRouteOptions<TAuth = undefined> {
  provider: OcrProvider
  /**
   * Runs before every request: check the session, rate-limit, and for
   * `{ key }` requests make sure the caller owns the file. Throw
   * `OcrRouteError` to deny.
   */
  authorize?: (context: {
    request: Request
    key?: string
  }) => TAuth | Promise<TAuth>
  /** Largest file in bytes. Default 20 MB. */
  maxFileSize?: number
  /** Allowed types, in `<input accept>` syntax. Default {@link OCR_TYPES}. */
  allowedTypes?: string | readonly string[]
  /**
   * Lets clients OCR files that are already uploaded, by posting
   * `{ "key": "…" }` as JSON. The storage must be able to read objects.
   */
  storage?: UploadStorage
  /** Called with every result, e.g. to save it. Return a value to replace it. */
  onResult?: (context: {
    request: Request
    auth: TAuth
    file: FileDescriptor
    key?: string
    result: OcrResult
  }) => OcrResult | void | Promise<OcrResult | void>
}

export class OcrRouteError extends Error {
  override readonly name = "OcrRouteError"
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message)
  }
}

const EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  gif: "image/gif",
  bmp: "image/bmp",
  pdf: "application/pdf",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  })
}

/**
 * A POST endpoint that reads text from a file with any provider. Send
 * `multipart/form-data` with a `file` field (what `ocrEndpoint` in
 * `@uploadcn/core` does), or JSON `{ "key": "…" }` for a stored upload.
 *
 * @example
 * // app/api/ocr/route.ts
 * export const { POST } = createOcrRoute({
 *   provider: googleVisionOcr({ apiKey: process.env.GOOGLE_VISION_API_KEY! }),
 *   authorize: async ({ request }) => requireUser(request),
 * })
 */
export function createOcrRoute<TAuth = undefined>(
  options: OcrRouteOptions<TAuth>
) {
  const maxFileSize = options.maxFileSize ?? 20 * 1024 * 1024
  const allowedTypes = options.allowedTypes ?? OCR_TYPES

  const check = (file: FileDescriptor) => {
    if (file.size > maxFileSize)
      throw new OcrRouteError("File is too large", 413)
    if (!matchesAccept(file, allowedTypes)) {
      throw new OcrRouteError("This file type can't be read", 415)
    }
  }

  async function handle(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST")
        return json({ error: "Method not allowed" }, 405)
      const contentType = request.headers.get("content-type") ?? ""
      const declared = Number(request.headers.get("content-length") ?? NaN)
      // Multipart adds a little overhead around the file itself.
      if (declared > maxFileSize + 64 * 1024) {
        throw new OcrRouteError("File is too large", 413)
      }

      let file: FileDescriptor
      let data: Uint8Array
      let key: string | undefined

      if (contentType.startsWith("multipart/form-data")) {
        const auth = await options.authorize?.({ request })
        let form: FormData
        try {
          form = await request.formData()
        } catch {
          throw new OcrRouteError("Expected multipart/form-data")
        }
        const entry = form.get("file")
        if (!(entry instanceof Blob)) throw new OcrRouteError('Missing "file"')
        file = {
          name: (entry as File).name?.slice(0, 255) || "file",
          type: entry.type || "application/octet-stream",
          size: entry.size,
        }
        check(file)
        data = new Uint8Array(await entry.arrayBuffer())
        return json(await run(request, auth as TAuth, file, data))
      }

      if (contentType.startsWith("application/json")) {
        if (!options.storage?.getObject) {
          throw new OcrRouteError("Reading stored files isn't enabled", 400)
        }
        let body: unknown
        try {
          body = await request.json()
        } catch {
          throw new OcrRouteError("Expected a JSON body")
        }
        key = (body as { key?: unknown } | null)?.key as string | undefined
        if (typeof key !== "string" || !key || key.length > 1024) {
          throw new OcrRouteError('Invalid "key"')
        }
        const auth = await options.authorize?.({ request, key })
        const info = await options.storage.headObject(key)
        if (info === null) throw new OcrRouteError("File not found", 404)
        const extension = key.split(".").pop()?.toLowerCase() ?? ""
        file = {
          name: key.split("/").pop() ?? key,
          type:
            info?.contentType ||
            EXTENSION_TYPES[extension] ||
            "application/octet-stream",
          size: info?.size ?? 0,
        }
        check(file)
        const stream = await options.storage.getObject(key)
        if (!stream) throw new OcrRouteError("File not found", 404)
        try {
          data = await readStream(stream, maxFileSize)
        } catch {
          throw new OcrRouteError("File is too large", 413)
        }
        return json(
          await run(
            request,
            auth as TAuth,
            { ...file, size: data.byteLength },
            data,
            key
          )
        )
      }

      throw new OcrRouteError("Send multipart/form-data or JSON", 415)
    } catch (error) {
      if (error instanceof OcrRouteError)
        return json({ error: error.message }, error.status)
      console.error("[uploadcn] OCR failed", error)
      // Provider messages can include account details; keep them in logs.
      return json({ error: "Couldn't read text from this file" }, 502)
    }
  }

  async function run(
    request: Request,
    auth: TAuth,
    file: FileDescriptor,
    data: Uint8Array,
    key?: string
  ) {
    const result = await options.provider.recognize({
      data,
      type: file.type,
      name: file.name,
      signal: request.signal,
    })
    return (
      (await options.onResult?.({ request, auth, file, key, result })) ?? result
    )
  }

  return { POST: handle, handler: handle }
}
