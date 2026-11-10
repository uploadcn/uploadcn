// Paste-to-upload in the styled components. It is opt-in, and there are
// three ways in: `paste` on a component, the UploadPaste wrapper around any
// block, and `paste` on UploadConfigProvider for the whole app.
import * as React from "react"
import { createAdapter } from "@uploadcn/core"
import { UploadConfigProvider } from "@uploadcn/react"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import PasteUploadExample from "@/examples/paste-upload"
import UploadPasteExample from "@/examples/upload-paste"
import { FileUpload } from "@/registry/default/blocks/file-upload"
import { UploadPaste } from "@/registry/default/blocks/upload-paste"
import {
  Upload,
  UploadDropzone,
  UploadDropzonePasteHint,
} from "@/registry/default/ui/upload"
import registry from "@/registry.json"

afterEach(cleanup)

function spyAdapter() {
  const names: string[] = []
  const adapter = createAdapter(async ({ file, onProgress }) => {
    names.push(file.name)
    onProgress(file.size)
    return { key: `uploads/${file.name}` }
  })
  return { adapter, names }
}

/** Dispatches a paste carrying files where a browser would: on the body. */
function paste(files: File[], target: Element = document.body) {
  const event = new Event("paste", { bubbles: true, cancelable: true })
  Object.defineProperty(event, "clipboardData", {
    value: {
      files,
      items: files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
      types: ["Files"],
    },
  })
  fireEvent(target, event)
  return event
}

const screenshot = () =>
  new File([new Uint8Array(64)], "", { type: "image/png", lastModified: 1 })
const png = (name: string) => new File(["x"], name, { type: "image/png" })
const root = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="upload"]')!
const dropzone = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="upload-dropzone"]')!
const hint = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(
    '[data-slot="upload-dropzone-paste-hint"]'
  )

describe("FileUpload paste", () => {
  it("is off unless asked for", () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(<FileUpload adapter={adapter} />)
    expect(root(container).hasAttribute("data-paste")).toBe(false)
    expect(dropzone(container).hasAttribute("data-paste")).toBe(false)

    fireEvent.focus(dropzone(container))
    const event = paste([screenshot()])

    expect(event.defaultPrevented).toBe(false)
    expect(names).toEqual([])
  })

  it("shows the shortcut and uploads a pasted screenshot", async () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(<FileUpload adapter={adapter} paste />)
    const zone = dropzone(container)

    expect(zone.hasAttribute("data-paste")).toBe(true)
    expect(hint(container)!.textContent).toBe(
      "or paste with Ctrl+V / ⌘VCommand V"
    )
    // Sighted users see the symbol, screen readers hear the word.
    expect(hint(container)!.querySelector("[aria-hidden]")!.textContent).toBe(
      "⌘V"
    )
    // The hint is tied to the dropzone's paste state, not always on.
    expect(hint(container)!.className).toContain(
      "group-data-paste/upload-dropzone:block"
    )

    fireEvent.focus(zone)
    paste([screenshot()])

    await waitFor(() => expect(names).toHaveLength(1))
    expect(names[0]).toMatch(/^pasted-image-\d{8}-\d{6}\.png$/)
    expect(await screen.findByText(names[0]!)).toBeTruthy()
    const status = screen.getByRole("status")
    expect(status.getAttribute("aria-live")).toBe("polite")
  })

  it("validates pasted files like dropped ones", async () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(
      <FileUpload adapter={adapter} paste accept="image/*" maxSize={1000} />
    )
    fireEvent.focus(dropzone(container))

    paste([
      new File(["%PDF"], "report.pdf", { type: "application/pdf" }),
      new File([new Uint8Array(5000)], "huge.png", { type: "image/png" }),
    ])

    await waitFor(() =>
      expect(
        [...container.querySelectorAll('[data-slot="upload-item"]')].map(
          (item) => item.getAttribute("data-status")
        )
      ).toEqual(["rejected", "rejected"])
    )
    expect(names).toEqual([])
  })

  it('takes pastes from anywhere with paste="global"', async () => {
    const { adapter, names } = spyAdapter()
    render(<FileUpload adapter={adapter} paste="global" />)

    paste([png("anywhere.png")])

    await waitFor(() => expect(names).toEqual(["anywhere.png"]))
  })

  it("lets the hint text be replaced", () => {
    const { adapter } = spyAdapter()
    const { container } = render(
      <Upload adapter={adapter} paste>
        <UploadDropzone>
          <UploadDropzonePasteHint>
            oder mit Strg+V einfügen
          </UploadDropzonePasteHint>
        </UploadDropzone>
      </Upload>
    )
    expect(hint(container)!.textContent).toBe("oder mit Strg+V einfügen")
  })
})

describe("UploadPaste", () => {
  it("adds paste to a block without changing it", async () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(
      <UploadPaste>
        <FileUpload adapter={adapter} />
      </UploadPaste>
    )
    expect(root(container).hasAttribute("data-paste")).toBe(true)
    // No wrapper element unless a hint is asked for: layout is untouched.
    expect(container.firstElementChild).toBe(root(container))

    fireEvent.pointerEnter(root(container))
    paste([screenshot()])

    await waitFor(() => expect(names).toHaveLength(1))
  })

  it("keeps the adapter and limits configured above it", async () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(
      <UploadConfigProvider adapter={adapter} accept="image/*">
        <UploadPaste global>
          <FileUpload />
        </UploadPaste>
      </UploadConfigProvider>
    )

    paste([
      png("ok.png"),
      new File(["%PDF"], "no.pdf", { type: "application/pdf" }),
    ])

    await waitFor(() => expect(names).toEqual(["ok.png"]))
    await waitFor(() =>
      expect(
        container.querySelectorAll('[data-status="rejected"]').length
      ).toBeGreaterThan(0)
    )
  })

  it("sends a paste to the uploader in use, once", async () => {
    const first = spyAdapter()
    const second = spyAdapter()
    const { container } = render(
      <UploadPaste>
        <FileUpload adapter={first.adapter} />
        <FileUpload adapter={second.adapter} />
      </UploadPaste>
    )
    const [, secondRoot] = container.querySelectorAll<HTMLElement>(
      '[data-slot="upload"]'
    )

    fireEvent.pointerEnter(secondRoot!)
    paste([png("b.png")])

    await waitFor(() => expect(second.names).toEqual(["b.png"]))
    expect(first.names).toEqual([])
  })

  it("shows a hint on request, with your own text if given", () => {
    const { adapter } = spyAdapter()
    const { container, rerender } = render(
      <UploadPaste hint>
        <FileUpload adapter={adapter} />
      </UploadPaste>
    )
    const line = () =>
      container.querySelector('[data-slot="upload-paste-hint"]')
    expect(line()!.textContent).toBe("Paste with Ctrl+V / ⌘VCommand V")

    rerender(
      <UploadPaste hint="Strg+V fügt einen Screenshot ein">
        <FileUpload adapter={adapter} />
      </UploadPaste>
    )
    expect(line()!.textContent).toBe("Strg+V fügt einen Screenshot ein")

    rerender(
      <UploadPaste hint disabled>
        <FileUpload adapter={adapter} />
      </UploadPaste>
    )
    expect(line()).toBeNull()
  })

  it("turns paste off with disabled, and a component can opt out", () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(
      <>
        <UploadPaste global disabled>
          <FileUpload adapter={adapter} />
        </UploadPaste>
        <UploadPaste global>
          <FileUpload adapter={adapter} paste={false} />
        </UploadPaste>
      </>
    )
    for (const element of container.querySelectorAll('[data-slot="upload"]'))
      expect(element.hasAttribute("data-paste")).toBe(false)

    const event = paste([screenshot()])

    expect(event.defaultPrevented).toBe(false)
    expect(names).toEqual([])
  })

  it("passes axe and renders on the server", async () => {
    const { adapter } = spyAdapter()
    const errors = vi.spyOn(console, "error")
    const { container } = render(
      <UploadPaste hint>
        <FileUpload adapter={adapter} />
      </UploadPaste>
    )
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false }, // needs real layout; covered by e2e
        region: { enabled: false }, // a fragment of a page, not a page
      },
    })
    expect(results.violations.map((violation) => violation.id)).toEqual([])
    expect(errors).not.toHaveBeenCalled()
  })
})

describe("every block", () => {
  // The promise of UploadPaste: it works with any block, because paste lives
  // on the <Upload> root that all of them render. Each block is wrapped,
  // given a pasted file of the kind it accepts, and must take it the way it
  // takes a picked file.
  const importBlock = (name: string): Promise<Record<string, unknown>> =>
    import(`../registry/default/blocks/${name}.tsx`)
  const pascal = (name: string) =>
    name.replace(/(^|-)([a-z0-9])/g, (_, __, char: string) =>
      char.toUpperCase()
    )
  const EXPORTS: Record<string, string> = {
    "image-metadata": "ImageMetadataUpload",
  }
  const PROPS: Record<string, Record<string, unknown>> = {
    "assignment-submission": { due: new Date(Date.now() + 86_400_000) },
    "upload-field": { label: "Attachments", name: "files" },
    "ocr-upload": {
      recognize: async () => ({ text: "", pages: [], provider: "test" }),
    },
  }
  const PNG = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    ),
    (char) => char.charCodeAt(0)
  )
  const fixtures = {
    png: () => new File([PNG], "pasted.png", { type: "image/png" }),
    pdf: () =>
      new File(["%PDF-1.4"], "pasted.pdf", { type: "application/pdf" }),
    csv: () =>
      new File(["sku,title,price\nA-1,Mug,12\n"], "pasted.csv", {
        type: "text/csv",
      }),
    mp3: () =>
      new File([new Uint8Array(64)], "pasted.mp3", { type: "audio/mpeg" }),
    mp4: () =>
      new File([new Uint8Array(64)], "pasted.mp4", { type: "video/mp4" }),
  }
  const FIXTURE: Record<string, keyof typeof fixtures> = {
    "csv-import": "csv",
    "document-upload": "pdf",
    "job-application-upload": "pdf",
    "audio-upload": "mp3",
    "video-upload": "mp4",
  }
  /** Add-ons for other uploaders, not uploaders themselves. */
  const SKIP = new Set(["upload-paste", "upload-confetti"])
  const blocks = registry.items
    .filter((item) => item.type === "registry:block" && !SKIP.has(item.name))
    .map((item) => [item.name] as const)

  async function load(name: string) {
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
            <main>The app</main>
            <GlobalDropzone />
            <UploadQueuePanel />
          </UploadProvider>
        )
      }
    }
    return exports[EXPORTS[name] ?? pascal(name)] as React.ComponentType<
      Record<string, unknown>
    >
  }

  /** What the user does before pasting, for blocks that start closed. */
  function open(name: string) {
    if (name !== "upload-dialog") return
    const trigger = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "Upload files"
    )
    fireEvent.click(trigger!)
  }

  /** Signs that a file reached the block. */
  const evidence = (names: string[], fileName: string) => ({
    uploads: names.length,
    statuses: document.querySelectorAll("[data-status]").length,
    named: Boolean(document.body.textContent?.includes(fileName)),
    dialogs: document.querySelectorAll("dialog[open]").length,
  })

  it.each(blocks)("%s is opt-in", async (name) => {
    const Block = await load(name)
    const { adapter, names } = spyAdapter()
    const { container } = render(
      <UploadConfigProvider adapter={adapter}>
        <Block {...(PROPS[name] ?? {})} />
      </UploadConfigProvider>
    )
    await act(async () => open(name))
    // The composer has always taken pastes in its own text area.
    if (name === "chat-attachments") return
    expect(document.querySelector("[data-paste]")).toBeNull()

    fireEvent.pointerEnter(container.firstElementChild ?? container)
    const event = paste([fixtures[FIXTURE[name] ?? "png"]()])

    expect(event.defaultPrevented).toBe(false)
    expect(names).toEqual([])
  })

  it.each(blocks)("%s takes a pasted file inside UploadPaste", async (name) => {
    const Block = await load(name)
    const { adapter, names } = spyAdapter()
    const file = fixtures[FIXTURE[name] ?? "png"]()
    const { container } = render(
      <UploadConfigProvider adapter={adapter}>
        <UploadPaste>
          <Block {...(PROPS[name] ?? {})} />
        </UploadPaste>
      </UploadConfigProvider>
    )
    await act(async () => open(name))
    const before = evidence(names, file.name)

    if (name === "chat-attachments") {
      // Its own paste: aimed at the composer, wrapper or not.
      await act(async () => {
        paste([file], container.querySelector("textarea")!)
      })
    } else {
      const zone = document.querySelector<HTMLElement>("[data-paste]")
      expect(zone, "the block's <Upload> takes pastes").not.toBeNull()
      // Like a user would: pointer over the component, then Ctrl+V.
      await act(async () => {
        fireEvent.pointerEnter(zone!.firstElementChild ?? zone!)
        const event = paste([file])
        expect(event.defaultPrevented, "the paste was claimed").toBe(true)
      })
    }

    // The same bar as a picked file (see blocks.test.tsx), and it has to
    // be the paste that got there: none of it was true before.
    await waitFor(() => {
      const now = evidence(names, file.name)
      const added =
        now.uploads > before.uploads ||
        now.statuses > before.statuses ||
        (now.named && !before.named) || // e.g. awaiting "Import"
        now.dialogs > before.dialogs // e.g. the crop step
      expect(added).toBe(true)
    })
  })

  it.each([
    ["identity-verification"],
    ["document-checklist"],
    ["job-application-upload"],
  ])("%s puts pasted files into its slots, never loose", async (name) => {
    const Block = await load(name)
    const { adapter } = spyAdapter()
    const kind = FIXTURE[name] ?? "png"
    const { container } = render(
      <UploadConfigProvider adapter={adapter}>
        <UploadPaste>
          <Block {...(PROPS[name] ?? {})} />
        </UploadPaste>
      </UploadConfigProvider>
    )
    const slots = () => [
      ...container.querySelectorAll<HTMLElement>('[data-slot="upload-slot"]'),
    ]
    const filled = () => slots().map((slot) => slot.hasAttribute("data-filled"))
    expect(slots().length).toBeGreaterThan(1)
    expect(filled().every((value) => !value)).toBe(true)
    const zone = container.querySelector<HTMLElement>("[data-paste]")!

    // On the form, not on a slot: the first empty slot takes it.
    await act(async () => {
      fireEvent.pointerEnter(zone)
      paste([fixtures[kind]()])
    })
    await waitFor(() => expect(filled()[0]).toBe(true))
    expect(filled().filter(Boolean)).toHaveLength(1)

    // On a specific slot: that slot takes it.
    const last = slots().length - 1
    await act(async () => {
      fireEvent.pointerOver(slots()[last]!)
      paste([fixtures[kind]()])
    })
    await waitFor(() => expect(filled()[last]).toBe(true))
    expect(filled().filter(Boolean)).toHaveLength(2)
  })
})

describe("docs examples", () => {
  it("paste-upload pastes into the site's configured storage", async () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(
      <UploadConfigProvider adapter={adapter}>
        <PasteUploadExample />
      </UploadConfigProvider>
    )
    fireEvent.pointerEnter(dropzone(container))
    paste([screenshot()])
    await waitFor(() => expect(names).toHaveLength(1))
  })

  it("upload-paste pastes into an animated block", async () => {
    const { adapter, names } = spyAdapter()
    const { container } = render(
      <UploadConfigProvider adapter={adapter}>
        <UploadPasteExample />
      </UploadConfigProvider>
    )
    expect(
      container.querySelector('[data-slot="upload-paste-hint"]')
    ).not.toBeNull()
    fireEvent.pointerEnter(root(container))
    paste([screenshot()])
    await waitFor(() => expect(names).toHaveLength(1))
  })
})
