// Behavior every block must have, generated for all of them: renders,
// is accessible, turns a picked file into an upload, escapes file names,
// renders on the server, and takes its storage from props or the provider.
import * as React from "react"
import { renderToString } from "react-dom/server"
import { createAdapter, type UploadAdapter } from "@uploadcn/core"
import { UploadConfigProvider } from "@uploadcn/react"
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Upload } from "@/registry/default/ui/upload"
import registry from "@/registry.json"

afterEach(cleanup)

const importBlock = (name: string): Promise<Record<string, unknown>> =>
  import(`../registry/default/blocks/${name}.tsx`)

const pascal = (name: string) =>
  name.replace(/(^|-)([a-z0-9])/g, (_, __, char: string) => char.toUpperCase())

/** Blocks whose main export isn't the PascalCase of the file name. */
const EXPORT_NAMES: Record<string, string> = {
  "image-metadata": "ImageMetadataUpload",
}

/** Required props, where a block has any. */
const PROPS: Record<string, Record<string, unknown>> = {
  "assignment-submission": { due: new Date(Date.now() + 86_400_000) },
  "upload-field": { label: "Attachments", name: "files" },
  "ocr-upload": {
    recognize: async () => ({
      text: "Total 9.99",
      pages: [],
      provider: "test",
    }),
  },
}

/** Steps before picking a file, for blocks that hide their picker. */
const BEFORE_PICK: Record<string, (container: HTMLElement) => void> = {
  // The queue lives in the modal: open it first.
  "upload-dialog": () => {
    const trigger = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "Upload files"
    )
    fireEvent.click(trigger!)
  },
}

const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  ),
  (char) => char.charCodeAt(0)
)
const fixtures = {
  png: (name = "photo.png") => new File([PNG], name, { type: "image/png" }),
  pdf: (name = "report.pdf") =>
    new File(["%PDF-1.4"], name, { type: "application/pdf" }),
  csv: (name = "products.csv") =>
    new File(["sku,title,price\nA-1,Mug,12\n"], name, { type: "text/csv" }),
  mp3: (name = "voice.mp3") =>
    new File([new Uint8Array(64)], name, { type: "audio/mpeg" }),
  mp4: (name = "clip.mp4") =>
    new File([new Uint8Array(64)], name, { type: "video/mp4" }),
}
const FIXTURE: Record<string, keyof typeof fixtures> = {
  "csv-import": "csv",
  "document-upload": "pdf",
  "job-application-upload": "pdf",
  "audio-upload": "mp3",
  "video-upload": "mp4",
}

function spyAdapter() {
  const calls: string[] = []
  const adapter = createAdapter(async ({ file, onProgress }) => {
    calls.push(file.name)
    onProgress(file.size)
    return { key: `uploads/${file.name}`, url: `https://cdn.test/${file.name}` }
  })
  return { adapter, calls }
}

function pickFile(container: HTMLElement, file: File) {
  // The first picker input: skip hidden form-submission inputs (they have a name).
  const input = [
    ...container.querySelectorAll<HTMLInputElement>('input[type="file"]'),
  ].find((element) => !element.name)
  if (!input) throw new Error("no file input")
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  fireEvent.change(input)
}

const blocks = registry.items.filter(
  (item) => item.type === "registry:block" && item.name !== "upload-confetti"
)

async function loadBlock(name: string) {
  const exports = await importBlock(name)
  if (name === "global-upload") {
    const { UploadProvider, GlobalDropzone, UploadQueuePanel } = exports as {
      UploadProvider: React.ComponentType<Record<string, unknown>>
      GlobalDropzone: React.ComponentType
      UploadQueuePanel: React.ComponentType
    }
    return function GlobalUploadBlock(props: Record<string, unknown>) {
      return (
        <UploadProvider {...props}>
          <GlobalDropzone />
          <UploadQueuePanel />
        </UploadProvider>
      )
    }
  }
  const Component = exports[EXPORT_NAMES[name] ?? pascal(name)]
  if (typeof Component !== "function")
    throw new Error(`${name}: no component export`)
  return Component as React.ComponentType<Record<string, unknown>>
}

function withProvider(
  adapter: UploadAdapter<unknown>,
  children: React.ReactNode
) {
  return (
    <UploadConfigProvider adapter={adapter}>{children}</UploadConfigProvider>
  )
}

describe.each(blocks.map((item) => [item.name] as const))("%s", (name) => {
  const props = PROPS[name] ?? {}
  const fixture = fixtures[FIXTURE[name] ?? "png"]

  it("renders without errors and passes axe", async () => {
    const errors = vi.spyOn(console, "error")
    const Block = await loadBlock(name)
    const { adapter } = spyAdapter()
    const { container } = render(withProvider(adapter, <Block {...props} />))
    expect(container.firstChild).not.toBeNull()
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false }, // needs real layout; covered by e2e
        region: { enabled: false }, // a fragment of a page, not a page
      },
    })
    expect(
      results.violations.map(
        (violation) => `${violation.id}: ${violation.nodes[0]?.html}`
      )
    ).toEqual([])
    expect(errors).not.toHaveBeenCalled()
  })

  it("turns a picked file into an upload", async () => {
    const Block = await loadBlock(name)
    const { adapter, calls } = spyAdapter()
    const { container } = render(withProvider(adapter, <Block {...props} />))
    const file = fixture()
    await act(async () => BEFORE_PICK[name]?.(container))
    await act(async () => pickFile(container, file))
    await waitFor(() => {
      const added =
        calls.length > 0 ||
        document.querySelector("[data-status]") !== null ||
        document.body.textContent?.includes(file.name) || // e.g. awaiting "Import"
        document.querySelector("dialog[open]") !== null // e.g. the crop step
      expect(added).toBe(true)
    })
  })

  it("renders hostile file names as text", async () => {
    const Block = await loadBlock(name)
    const { adapter } = spyAdapter()
    const { container } = render(withProvider(adapter, <Block {...props} />))
    const hostile = `"><img src=x onerror="window.__xss=1">${fixture().name}`
    await act(async () => pickFile(container, fixture(hostile)))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(document.querySelector("img[onerror]")).toBeNull()
    expect((window as { __xss?: number }).__xss).toBeUndefined()
  })

  it("renders on the server", async () => {
    const Block = await loadBlock(name)
    const { adapter } = spyAdapter()
    expect(() =>
      renderToString(withProvider(adapter, <Block {...props} />))
    ).not.toThrow()
  })
})

describe("storage resolution", () => {
  it("a component's adapter prop wins over UploadConfigProvider", async () => {
    const Block = await loadBlock("file-upload")
    const provider = spyAdapter()
    const own = spyAdapter()
    const { container } = render(
      withProvider(provider.adapter, <Block adapter={own.adapter} />)
    )
    await act(async () => pickFile(container, fixtures.png()))
    await waitFor(() => expect(own.calls).toEqual(["photo.png"]))
    expect(provider.calls).toEqual([])
  })

  it("renders without an adapter and explains how to configure storage", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<Upload />)).not.toThrow()
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(/UploadConfigProvider/)
    )
  })

  it("UploadConfetti works inside any Upload", async () => {
    const { UploadConfetti } = (await importBlock("upload-confetti")) as {
      UploadConfetti: React.ComponentType
    }
    const { adapter } = spyAdapter()
    const { container } = render(
      withProvider(
        adapter,
        <Upload>
          <UploadConfetti />
        </Upload>
      )
    )
    expect(
      container.querySelector('[data-slot="upload-confetti"]')
    ).not.toBeNull()
  })

  it("OcrUpload reads the text after upload and shows it", async () => {
    const { OcrUpload } = (await importBlock("ocr-upload")) as {
      OcrUpload: React.ComponentType<Record<string, unknown>>
    }
    const { adapter } = spyAdapter()
    const recognize = vi.fn(async () => ({
      text: "BLUE BOTTLE\nTOTAL 15.81",
      pages: [{ number: 1, text: "BLUE BOTTLE\nTOTAL 15.81" }],
      confidence: 0.91,
      fields: { total: { value: "15.81" } },
      provider: "test",
    }))
    const onResult = vi.fn()
    const { container } = render(
      withProvider(
        adapter,
        <OcrUpload recognize={recognize} onResult={onResult} />
      )
    )
    await act(async () => pickFile(container, fixtures.png("receipt.png")))
    await waitFor(() =>
      expect(container.querySelector("pre")?.textContent).toContain(
        "TOTAL 15.81"
      )
    )
    expect(container.textContent).toContain("91% confidence")
    expect(container.querySelector("dd")?.textContent).toBe("15.81")
    expect(onResult).toHaveBeenCalledTimes(1)
  })

  it("ReceiptUpload fills the form from OCR", async () => {
    const { ReceiptUpload, receiptFromOcr } = (await importBlock(
      "receipt-upload"
    )) as {
      ReceiptUpload: React.ComponentType<Record<string, unknown>>
      receiptFromOcr: (result: unknown) => Record<string, string>
    }
    expect(
      receiptFromOcr({
        text: "Blue Bottle Coffee\n14/03/2026 09:42\nSubtotal 14.50\nTOTAL 15,81",
        pages: [],
        provider: "t",
      })
    ).toEqual({
      merchant: "Blue Bottle Coffee",
      date: "2026-03-14",
      amount: "15.81",
    })
    expect(
      receiptFromOcr({
        text: "",
        pages: [],
        fields: {
          merchant: { value: "ACME" },
          date: { value: "3 Mar 2026" },
          total: { value: "$1,204.50" },
        },
        provider: "t",
      })
    ).toEqual({ merchant: "ACME", date: "2026-03-03", amount: "1204.50" })

    const { adapter } = spyAdapter()
    const recognize = vi.fn(async () => ({
      text: "Corner Shop\n2026-01-02\nTotal 7.25",
      pages: [],
      provider: "t",
    }))
    const { container } = render(
      withProvider(adapter, <ReceiptUpload recognize={recognize} />)
    )
    await act(async () => pickFile(container, fixtures.png("receipt.png")))
    const value = (id: string) =>
      (container.querySelector(`#${id}`) as HTMLInputElement).value
    await waitFor(() => expect(value("receipt-amount")).toBe("7.25"))
    expect(value("receipt-merchant")).toBe("Corner Shop")
    expect(value("receipt-date")).toBe("2026-01-02")
  })
})
