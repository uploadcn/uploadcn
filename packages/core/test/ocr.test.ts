import { describe, expect, it, vi } from "vitest"

import { postJson } from "../src/adapters/shared"
import { createAdapter } from "../src/adapters/custom"
import { isUploadError } from "../src/errors"
import {
  ocrEndpoint,
  ocrProcess,
  tesseractOcr,
  type OcrResult,
  type TesseractModule,
} from "../src/ocr"
import { createUploader } from "../src/uploader"

const RESULT: OcrResult = {
  text: "Hello",
  pages: [{ number: 1, text: "Hello" }],
  provider: "test",
}
const png = () =>
  new File([new Uint8Array(4)], "scan.png", { type: "image/png" })
const signal = () => new AbortController().signal

function uploaderWith(process: ReturnType<typeof ocrProcess>) {
  return createUploader({
    adapter: createAdapter(async ({ file }) => ({ name: file.name })),
    process,
    retry: false,
    network: false,
  })
}

async function settled(uploader: ReturnType<typeof uploaderWith>) {
  await vi.waitFor(() =>
    expect(["success", "error", "rejected"]).toContain(
      uploader.getState().items[0]?.status
    )
  )
  return uploader.getState().items[0]!
}

describe("ocrProcess", () => {
  it("reads images after upload and stores the text on meta", async () => {
    const recognize = vi.fn(async () => RESULT)
    const uploader = uploaderWith(ocrProcess(recognize))
    await uploader.add([png()])
    const item = await settled(uploader)
    expect(item.status).toBe("success")
    expect(item.meta.ocr).toEqual(RESULT)
    expect(item.result).toEqual({ name: "scan.png" })
  })

  it("skips files it can't read", async () => {
    const recognize = vi.fn(async () => RESULT)
    const uploader = uploaderWith(ocrProcess(recognize))
    await uploader.add([new File(["x"], "notes.txt", { type: "text/plain" })])
    expect((await settled(uploader)).status).toBe("success")
    expect(recognize).not.toHaveBeenCalled()
  })

  it("keeps the upload when OCR fails, unless it is required", async () => {
    const fail = vi.fn(async () => {
      throw new Error("quota exceeded")
    })
    const optional = uploaderWith(ocrProcess(fail))
    await optional.add([png()])
    const item = await settled(optional)
    expect(item.status).toBe("success")
    expect(item.meta.ocrError).toBe("quota exceeded")

    const required = uploaderWith(ocrProcess(fail, { required: true }))
    await required.add([png()])
    expect((await settled(required)).status).toBe("rejected")
  })
})

describe("ocrEndpoint", () => {
  it("posts the file as multipart and returns the result", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect((init!.body as FormData).get("file")).toBeInstanceOf(File)
      expect((init!.headers as Record<string, string>).authorization).toBe(
        "Bearer t"
      )
      return Response.json(RESULT)
    })
    const recognize = ocrEndpoint("/api/ocr", {
      fetch,
      headers: async () => ({ authorization: "Bearer t" }),
    })
    expect(await recognize(png(), { signal: signal() })).toEqual(RESULT)
  })

  it("turns error responses into readable errors", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ error: "This file type can't be read" }, { status: 415 })
    )
    const error = await ocrEndpoint("/api/ocr", { fetch })(png(), {
      signal: signal(),
    }).catch((thrown) => thrown)
    expect(isUploadError(error) && error.message).toBe(
      "This file type can't be read"
    )
    const bad = vi.fn(async () => Response.json({ nope: true }))
    await expect(
      ocrEndpoint("/api/ocr", { fetch: bad })(png(), { signal: signal() })
    ).rejects.toThrow(/unexpected/)
  })
})

describe("tesseractOcr", () => {
  function fakeTesseract() {
    const recognize = vi.fn(async () => ({
      data: { text: "Line one\nLine two\n", confidence: 87 },
    }))
    const terminate = vi.fn(async () => {})
    const createWorker = vi.fn(async () => ({ recognize, terminate }))
    const module: TesseractModule = { createWorker }
    return { module, createWorker, recognize, terminate }
  }

  it("loads tesseract lazily, once, and normalizes the result", async () => {
    const fake = fakeTesseract()
    const load = vi.fn(async () => ({ default: fake.module }))
    const ocr = tesseractOcr({ load, lang: ["eng", "deu"] })
    expect(load).not.toHaveBeenCalled()
    const [first] = await Promise.all([
      ocr(png(), { signal: signal() }),
      ocr(png(), { signal: signal() }),
    ])
    expect(load).toHaveBeenCalledTimes(1)
    expect(fake.createWorker).toHaveBeenCalledWith(
      ["eng", "deu"],
      undefined,
      undefined
    )
    expect(first).toEqual({
      text: "Line one\nLine two",
      pages: [
        {
          number: 1,
          text: "Line one\nLine two",
          lines: [{ text: "Line one" }, { text: "Line two" }],
        },
      ],
      confidence: 0.87,
      provider: "tesseract",
    })
    await ocr.terminate()
    expect(fake.terminate).toHaveBeenCalled()
  })

  it("rejects promptly when aborted", async () => {
    const fake = fakeTesseract()
    fake.recognize.mockImplementation(() => new Promise(() => {}))
    const ocr = tesseractOcr({ load: async () => fake.module })
    const controller = new AbortController()
    const pending = ocr(png(), { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: "aborted" })
  })
})

describe("postJson", () => {
  it("maps a rejected response to a final rejected error", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        {
          error: "This file contains malware and was removed",
          code: "rejected",
        },
        { status: 422 }
      )
    )
    const error = await postJson("/api/upload", {}, { fetch }).catch(
      (thrown) => thrown
    )
    expect(error).toMatchObject({
      code: "rejected",
      retryable: false,
      status: 422,
    })
  })
})
