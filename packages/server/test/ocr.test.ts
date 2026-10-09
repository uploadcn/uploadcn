import { ocrEndpoint } from "@uploadcn/core"
import { describe, expect, it, vi } from "vitest"

import type { UploadStorage } from "../src"
import {
  OcrRouteError,
  awsTextractOcr,
  azureDocumentIntelligenceOcr,
  createOcrProvider,
  createOcrRoute,
  googleVisionOcr,
  httpOcr,
  mistralOcr,
  toBase64,
} from "../src/ocr"

const PNG = new Uint8Array([137, 80, 78, 71, 1, 2, 3])
const input = { data: PNG, type: "image/png", name: "receipt.png" }

type Call = [RequestInfo | URL, RequestInit | undefined]
const bodyOf = async (call: Call) =>
  call[0] instanceof Request
    ? await call[0].clone().json()
    : JSON.parse(String(call[1]?.body))

describe("toBase64", () => {
  it("matches Node's encoder, including large inputs", () => {
    const big = new Uint8Array(100_000).map((_, index) => index % 256)
    expect(toBase64(PNG)).toBe(Buffer.from(PNG).toString("base64"))
    expect(toBase64(big)).toBe(Buffer.from(big).toString("base64"))
  })
})

describe("googleVisionOcr", () => {
  it("sends images to images:annotate with the key in a header", async () => {
    const fetch = vi.fn(async (..._: Call) =>
      Response.json({
        responses: [
          {
            fullTextAnnotation: {
              text: "Total 12.00\nThank you\n",
              pages: [{ confidence: 0.9 }],
            },
          },
        ],
      })
    )
    const result = await googleVisionOcr({
      apiKey: "g-key",
      fetch,
      languageHints: ["en"],
    }).recognize(input)
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe("https://vision.googleapis.com/v1/images:annotate")
    expect(String(url)).not.toContain("g-key")
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "g-key"
    )
    expect(await bodyOf(fetch.mock.calls[0]!)).toEqual({
      requests: [
        {
          image: { content: toBase64(PNG) },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["en"] },
        },
      ],
    })
    expect(result).toMatchObject({
      text: "Total 12.00\nThank you",
      confidence: 0.9,
      provider: "google-vision",
      pages: [
        { number: 1, lines: [{ text: "Total 12.00" }, { text: "Thank you" }] },
      ],
    })
  })

  it("sends PDFs to files:annotate and returns one page per response", async () => {
    const fetch = vi.fn(async (..._: Call) =>
      Response.json({
        responses: [
          {
            responses: [
              { fullTextAnnotation: { text: "Page one" } },
              { fullTextAnnotation: { text: "Page two" } },
            ],
          },
        ],
      })
    )
    const result = await googleVisionOcr({
      accessToken: async () => "tok",
      fetch,
    }).recognize({
      ...input,
      type: "application/pdf",
    })
    expect(fetch.mock.calls[0]![0]).toBe(
      "https://vision.googleapis.com/v1/files:annotate"
    )
    expect(
      (fetch.mock.calls[0]![1]!.headers as Record<string, string>).authorization
    ).toBe("Bearer tok")
    expect(result.pages.map((page) => page.text)).toEqual([
      "Page one",
      "Page two",
    ])
    expect(result.text).toBe("Page one\n\nPage two")
  })

  it("throws on per-image errors and requires credentials", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ responses: [{ error: { message: "Bad image data" } }] })
    )
    await expect(
      googleVisionOcr({ apiKey: "k", fetch }).recognize(input)
    ).rejects.toThrow(/Bad image data/)
    expect(() => googleVisionOcr({})).toThrow(/apiKey/)
  })
})

describe("awsTextractOcr", () => {
  const credentials = {
    region: "us-east-1",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "secret",
  }

  it("signs DetectDocumentText requests and groups lines by page", async () => {
    const fetch = vi.fn(async (..._: Call) =>
      Response.json({
        Blocks: [
          { BlockType: "PAGE" },
          { BlockType: "LINE", Text: "ACME Store", Confidence: 99 },
          { BlockType: "WORD", Text: "ACME", Confidence: 99 },
          { BlockType: "LINE", Text: "Total 9.99", Confidence: 95 },
        ],
      })
    )
    const result = await awsTextractOcr({ ...credentials, fetch }).recognize(
      input
    )
    const request = fetch.mock.calls[0]![0] as Request
    expect(request.url).toBe("https://textract.us-east-1.amazonaws.com/")
    expect(request.headers.get("x-amz-target")).toBe(
      "Textract.DetectDocumentText"
    )
    expect(request.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d+\/us-east-1\/textract\//
    )
    expect(await bodyOf(fetch.mock.calls[0]!)).toEqual({
      Document: { Bytes: toBase64(PNG) },
    })
    expect(result.text).toBe("ACME Store\nTotal 9.99")
    expect(result.confidence).toBeCloseTo(0.97)
  })

  it("maps AnalyzeExpense summary fields to normalized names", async () => {
    const fetch = vi.fn(async (..._: Call) =>
      Response.json({
        ExpenseDocuments: [
          {
            SummaryFields: [
              {
                Type: { Text: "VENDOR_NAME" },
                ValueDetection: { Text: "ACME", Confidence: 98 },
              },
              {
                Type: { Text: "TOTAL" },
                ValueDetection: { Text: "$9.99", Confidence: 97 },
                Currency: { Code: "USD" },
              },
              {
                Type: { Text: "INVOICE_RECEIPT_DATE" },
                ValueDetection: { Text: "2026-01-02", Confidence: 90 },
              },
              { Type: { Text: "OTHER" }, ValueDetection: { Text: "ignored" } },
            ],
            Blocks: [{ BlockType: "LINE", Text: "ACME", Confidence: 98 }],
          },
        ],
      })
    )
    const result = await awsTextractOcr({
      ...credentials,
      model: "expense",
      fetch,
    }).recognize(input)
    expect(
      (fetch.mock.calls[0]![0] as Request).headers.get("x-amz-target")
    ).toBe("Textract.AnalyzeExpense")
    expect(result.fields).toEqual({
      merchant: { value: "ACME", confidence: 0.98 },
      total: { value: "$9.99", confidence: 0.97 },
      currency: { value: "USD" },
      date: { value: "2026-01-02", confidence: 0.9 },
    })
  })

  it("reports API errors", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        { message: "Request has unsupported document format" },
        { status: 400 }
      )
    )
    await expect(
      awsTextractOcr({ ...credentials, fetch }).recognize(input)
    ).rejects.toThrow(/unsupported document format/)
  })
})

describe("azureDocumentIntelligenceOcr", () => {
  const endpoint = "https://my-resource.cognitiveservices.azure.com/"

  it("starts an analysis, polls it and maps receipt fields", async () => {
    let polls = 0
    const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(null, {
          status: 202,
          headers: {
            "operation-location": `${endpoint}documentintelligence/documentModels/prebuilt-receipt/analyzeResults/1`,
          },
        })
      }
      polls++
      if (polls === 1)
        return Response.json(
          { status: "running" },
          { headers: { "retry-after": "0" } }
        )
      return Response.json({
        status: "succeeded",
        analyzeResult: {
          content: "Contoso\nTotal 14.50",
          pages: [
            {
              pageNumber: 1,
              lines: [{ content: "Contoso" }, { content: "Total 14.50" }],
              words: [{ confidence: 0.9 }, { confidence: 0.8 }],
            },
          ],
          documents: [
            {
              fields: {
                MerchantName: {
                  valueString: "Contoso",
                  content: "Contoso",
                  confidence: 0.95,
                },
                Total: {
                  valueCurrency: { amount: 14.5, currencyCode: "EUR" },
                  content: "14.50",
                  confidence: 0.9,
                },
              },
            },
          ],
        },
      })
    })
    vi.useFakeTimers({ toFake: ["setTimeout"] })
    const promise = azureDocumentIntelligenceOcr({
      endpoint,
      apiKey: "az-key",
      model: "prebuilt-receipt",
      fetch,
    }).recognize(input)
    await vi.runAllTimersAsync()
    const result = await promise
    vi.useRealTimers()

    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe(
      "https://my-resource.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-receipt:analyze?api-version=2024-11-30"
    )
    expect(
      (init!.headers as Record<string, string>)["ocp-apim-subscription-key"]
    ).toBe("az-key")
    expect(JSON.parse(String(init!.body))).toEqual({
      base64Source: toBase64(PNG),
    })
    expect(result).toMatchObject({
      text: "Contoso\nTotal 14.50",
      fields: {
        merchant: { value: "Contoso" },
        total: { value: "14.5" },
        currency: { value: "EUR" },
      },
      provider: "azure-document-intelligence",
    })
    expect(result.confidence).toBeCloseTo(0.85)
  })

  it("never sends the key to a poll URL on another origin", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 202,
          headers: { "operation-location": "https://attacker.example/steal" },
        })
    )
    await expect(
      azureDocumentIntelligenceOcr({
        endpoint,
        apiKey: "az-key",
        fetch,
      }).recognize(input)
    ).rejects.toThrow(/unexpected operation URL/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe("mistralOcr", () => {
  it("sends images as image_url and PDFs as document_url, and keeps Markdown", async () => {
    const fetch = vi.fn(async (..._: Call) =>
      Response.json({
        pages: [
          {
            index: 0,
            markdown: "# Invoice\n\n**Total**: 10\n\n| a | b |\n| --- | --- |",
          },
        ],
      })
    )
    const provider = mistralOcr({ apiKey: "m-key", fetch })
    const image = await provider.recognize(input)
    await provider.recognize({ ...input, type: "application/pdf" })

    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe("https://api.mistral.ai/v1/ocr")
    expect((init!.headers as Record<string, string>).authorization).toBe(
      "Bearer m-key"
    )
    expect((await bodyOf(fetch.mock.calls[0]!)).document).toEqual({
      type: "image_url",
      image_url: `data:image/png;base64,${toBase64(PNG)}`,
    })
    expect((await bodyOf(fetch.mock.calls[1]!)).document.type).toBe(
      "document_url"
    )
    expect(image.markdown).toContain("# Invoice")
    expect(image.text).toBe("Invoice\n\nTotal: 10\n\n| a | b |")
  })
})

describe("httpOcr and createOcrProvider", () => {
  it("posts multipart to your backend and accepts OcrResult JSON", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const file = (init!.body as FormData).get("file") as File
      return Response.json({ text: `read ${file.name} (${file.size} bytes)` })
    })
    const result = await httpOcr({
      url: "https://ocr.internal/read",
      name: "paddle",
      fetch,
    }).recognize(input)
    expect(result).toEqual({
      text: "read receipt.png (7 bytes)",
      pages: [{ number: 1, text: "read receipt.png (7 bytes)" }],
      provider: "paddle",
    })
  })

  it("supports custom parsing and rejects bad shapes", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ result: { lines: ["a", "b"] } })
    )
    const parsed = await httpOcr({
      url: "https://ocr.internal",
      fetch,
      parse: (body) => {
        const lines = (body as { result: { lines: string[] } }).result.lines
        return {
          text: lines.join("\n"),
          pages: [{ number: 1, text: lines.join("\n") }],
        }
      },
    }).recognize(input)
    expect(parsed.text).toBe("a\nb")
    await expect(
      httpOcr({ url: "https://ocr.internal", fetch }).recognize(input)
    ).rejects.toThrow(/unexpected/)
  })

  it("wraps functions", async () => {
    const provider = createOcrProvider("tesseract-node", async () => ({
      text: "hi",
      pages: [],
    }))
    expect(await provider.recognize(input)).toEqual({
      text: "hi",
      pages: [],
      provider: "tesseract-node",
    })
  })
})

describe("createOcrRoute", () => {
  const echo = createOcrProvider("echo", async ({ data, type }) => ({
    text: `${type}:${data.byteLength}`,
    pages: [],
  }))
  const ORIGIN = "http://localhost"
  const post = (
    route: { POST(r: Request): Promise<Response> },
    body: BodyInit,
    headers: Record<string, string> = {}
  ) =>
    route.POST(
      new Request(`${ORIGIN}/api/ocr`, { method: "POST", body, headers })
    )
  const form = (file: Blob, name = "scan.png") => {
    const data = new FormData()
    data.append("file", file, name)
    return data
  }

  it("works end to end with ocrEndpoint from @uploadcn/core", async () => {
    const route = createOcrRoute({ provider: echo })
    const fetch = (async (url: RequestInfo | URL, init?: RequestInit) =>
      route.POST(
        new Request(new URL(String(url), ORIGIN), init)
      )) as typeof globalThis.fetch
    const recognize = ocrEndpoint("/api/ocr", { fetch })
    const result = await recognize(
      new File([PNG], "a.png", { type: "image/png" }),
      {
        signal: new AbortController().signal,
      }
    )
    expect(result).toEqual({ text: "image/png:7", pages: [], provider: "echo" })
  })

  it("authorizes before reading the body", async () => {
    const provider = { name: "spy", recognize: vi.fn() }
    const route = createOcrRoute({
      provider,
      authorize: () => {
        throw new OcrRouteError("Sign in first", 401)
      },
    })
    const response = await post(
      route,
      form(new Blob([PNG], { type: "image/png" }))
    )
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "Sign in first" })
    expect(provider.recognize).not.toHaveBeenCalled()
  })

  it("rejects SVG, unknown types and oversized files", async () => {
    const route = createOcrRoute({ provider: echo, maxFileSize: 10 })
    const svg = await post(
      route,
      form(new Blob(["<svg/>"], { type: "image/svg+xml" }), "x.svg")
    )
    expect(svg.status).toBe(415)
    const text = await post(
      route,
      form(new Blob(["hi"], { type: "text/html" }), "x.html")
    )
    expect(text.status).toBe(415)
    const big = await post(
      route,
      form(new Blob([new Uint8Array(11)], { type: "image/png" }))
    )
    expect(big.status).toBe(413)
    const declared = await post(route, "x", {
      "content-type": "multipart/form-data; boundary=x",
      "content-length": String(10 ** 9),
    })
    expect(declared.status).toBe(413)
  })

  it("hides provider errors from the client", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const route = createOcrRoute({
      provider: createOcrProvider("bad", async () => {
        throw new Error("account 1234 over quota")
      }),
    })
    const response = await post(
      route,
      form(new Blob([PNG], { type: "image/png" }))
    )
    expect(response.status).toBe(502)
    expect(JSON.stringify(await response.json())).not.toContain("1234")
    error.mockRestore()
  })

  it("reads stored files by key when storage is given, after authorizing the key", async () => {
    const authorize = vi.fn(({ key }: { key?: string }) => {
      if (key?.startsWith("other/")) throw new OcrRouteError("Not yours", 403)
      return { user: "u1" }
    })
    const storage = {
      name: "bytes",
      headObject: async (key: string) =>
        key.endsWith("missing.png") ? null : { size: PNG.byteLength },
      getObject: async () => new Blob([PNG]).stream(),
    } as unknown as UploadStorage
    const onResult = vi.fn(({ result }) => ({
      ...result,
      text: result.text.toUpperCase(),
    }))
    const route = createOcrRoute({
      provider: echo,
      storage,
      authorize,
      onResult,
    })
    const json = (body: unknown) =>
      post(route, JSON.stringify(body), { "content-type": "application/json" })

    const ok = await json({ key: "u1/scan.png" })
    expect(await ok.json()).toMatchObject({ text: "IMAGE/PNG:7" })
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ key: "u1/scan.png", auth: { user: "u1" } })
    )
    expect((await json({ key: "other/scan.png" })).status).toBe(403)
    expect((await json({ key: "u1/missing.png" })).status).toBe(404)
    expect((await json({ key: 42 })).status).toBe(400)
    expect((await json({ key: "u1/notes.svg" })).status).toBe(415)
  })

  it("refuses key requests without storage, and other methods", async () => {
    const route = createOcrRoute({ provider: echo })
    expect(
      (
        await post(route, JSON.stringify({ key: "a.png" }), {
          "content-type": "application/json",
        })
      ).status
    ).toBe(400)
    expect((await route.POST(new Request(`${ORIGIN}/api/ocr`))).status).toBe(
      405
    )
  })
})
