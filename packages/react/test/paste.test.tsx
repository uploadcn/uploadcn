// Paste-to-upload: opt in with `paste`, and Ctrl/⌘+V on a focused or
// hovered upload component adds the clipboard's files through the same path
// as a drop.
import { type UploadAdapter, createAdapter } from "@uploadcn/core"
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  Upload,
  UploadConfigProvider,
  useDropzonePaste,
  usePasteFiles,
} from "../src"

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

const file = (name: string, type: string, size = 5) =>
  new File([new Uint8Array(size)], name, { type, lastModified: 1 })

/** A screenshot as the clipboard holds it: a PNG blob without a name. */
const screenshot = () => file("", "image/png", 2048)

interface PasteInit {
  files?: File[]
  text?: string
}

/** A paste event carrying files (and/or text), as a browser dispatches it. */
function pasteEvent({ files = [], text }: PasteInit) {
  const event = new Event("paste", { bubbles: true, cancelable: true })
  Object.defineProperty(event, "clipboardData", {
    value: {
      files,
      items: [
        ...(text === undefined
          ? []
          : [{ kind: "string", type: "text/plain", getAsFile: () => null }]),
        ...files.map((item) => ({
          kind: "file",
          type: item.type,
          getAsFile: () => item,
        })),
      ],
      types: [
        ...(text === undefined ? [] : ["text/plain"]),
        ...(files.length ? ["Files"] : []),
      ],
      getData: () => text ?? "",
    },
  })
  return event
}

/** Dispatches a paste where the browser would: on the focused element. */
function paste(init: PasteInit, target: Element = document.body) {
  const event = pasteEvent(init)
  fireEvent(target, event)
  return event
}

/** An uploader with paste on, unless a test says otherwise. */
function Uploader({
  adapter,
  dropzone,
  children,
  paste: pasteMode = true,
  ...props
}: Partial<React.ComponentProps<typeof Upload.Root>> & {
  adapter: UploadAdapter
  dropzone?: Partial<React.ComponentProps<typeof Upload.Dropzone>>
}) {
  return (
    <Upload.Root
      network={false}
      retry={false}
      {...(props as object)}
      adapter={adapter}
      paste={pasteMode === null ? undefined : pasteMode}
      data-testid="root"
    >
      <Upload.Dropzone {...dropzone}>
        {dropzone?.children ?? "Drop files"}
      </Upload.Dropzone>
      {children}
      <Upload.List>
        {(item) => (
          <Upload.Item item={item} data-testid="item" data-name={item.name}>
            <Upload.Name />
            <Upload.Status />
            <Upload.Error />
          </Upload.Item>
        )}
      </Upload.List>
    </Upload.Root>
  )
}

const getDropzone = () => screen.getByRole("button", { name: "Drop files" })
const itemNames = () =>
  screen.queryAllByTestId("item").map((item) => item.getAttribute("data-name"))

describe("paste to upload", () => {
  it("uploads a pasted image blob and gives it a name", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} />)
    fireEvent.focus(getDropzone())

    const event = paste({ files: [screenshot()] })

    await waitFor(() => expect(names).toHaveLength(1))
    expect(names[0]).toMatch(/^pasted-image-\d{8}-\d{6}\.png$/)
    expect(screen.getByText(names[0]!)).toBeTruthy()
    // The paste was claimed, so the browser does nothing else with it.
    expect(event.defaultPrevented).toBe(true)
  })

  it("uploads multiple pasted files at once", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} />)
    fireEvent.focus(getDropzone())

    paste({
      files: [
        file("a.png", "image/png"),
        file("b.pdf", "application/pdf"),
        screenshot(),
      ],
    })

    await waitFor(() => expect(names).toHaveLength(3))
    expect(names.slice(0, 2)).toEqual(["a.png", "b.pdf"])
    expect(names[2]).toMatch(/^pasted-image-/)
  })

  it("rejects a pasted file of a type that is not accepted", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} accept="image/*" />)
    fireEvent.focus(getDropzone())

    paste({ files: [file("notes.txt", "text/plain")] })

    await screen.findByText(/File type not allowed/, { selector: "p" })
    expect(screen.getByText("Rejected")).toBeTruthy()
    expect(names).toEqual([])
  })

  it("rejects a pasted file over maxSize", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} maxSize={1000} />)
    fireEvent.focus(getDropzone())

    paste({ files: [file("huge.png", "image/png", 5000)] })

    await waitFor(() =>
      expect(screen.getByTestId("item").getAttribute("data-status")).toBe(
        "rejected"
      )
    )
    expect(
      screen.getByText("File is larger than 1 KB", { selector: "p" })
    ).toBeTruthy()
    expect(names).toEqual([])
  })

  it("applies maxFiles to pasted files", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} maxFiles={2} />)
    fireEvent.focus(getDropzone())

    paste({
      files: [
        file("1.png", "image/png"),
        file("2.png", "image/png"),
        file("3.png", "image/png"),
      ],
    })

    await waitFor(() => expect(itemNames()).toHaveLength(3))
    await waitFor(() => expect(names).toEqual(["1.png", "2.png"]))
    expect(
      screen
        .getAllByTestId("item")
        .map((item) => item.getAttribute("data-status"))
        .filter((status) => status === "rejected")
    ).toHaveLength(1)
  })

  it("replaces the file in single-file mode", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} multiple={false} />)
    fireEvent.focus(getDropzone())

    paste({ files: [file("a.png", "image/png"), file("b.png", "image/png")] })
    await waitFor(() => expect(names).toEqual(["a.png"]))

    paste({ files: [file("c.png", "image/png")] })
    await waitFor(() => expect(itemNames()).toEqual(["c.png"]))
  })

  it("announces pasted files in the polite live region", async () => {
    const { adapter } = spyAdapter()
    // Hold uploads back so the "added" announcement is the latest one.
    render(<Uploader adapter={adapter} autoUpload={false} />)
    fireEvent.focus(getDropzone())

    paste({ files: [file("a.png", "image/png"), file("b.png", "image/png")] })

    const status = await screen.findByText("2 files added")
    expect(status.getAttribute("role")).toBe("status")
    expect(status.getAttribute("aria-live")).toBe("polite")
  })
})

describe("where paste is handled", () => {
  it("ignores pastes while the dropzone is neither focused nor hovered", () => {
    const { adapter } = spyAdapter()
    render(<Uploader adapter={adapter} />)

    const event = paste({ files: [screenshot()] })

    expect(itemNames()).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })

  it("handles pastes while the pointer is over the dropzone", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} />)
    const dropzone = getDropzone()

    fireEvent.pointerEnter(dropzone)
    paste({ files: [file("hovered.png", "image/png")] })
    await waitFor(() => expect(names).toEqual(["hovered.png"]))

    fireEvent.pointerLeave(dropzone)
    paste({ files: [file("left.png", "image/png")] })
    expect(itemNames()).toEqual(["hovered.png"])
  })

  it("stops handling pastes once focus leaves the dropzone", async () => {
    const { adapter, names } = spyAdapter()
    render(<Uploader adapter={adapter} />)
    const dropzone = getDropzone()

    fireEvent.focus(dropzone)
    fireEvent.blur(dropzone)
    paste({ files: [screenshot()] })

    expect(itemNames()).toEqual([])
    expect(names).toEqual([])
  })

  it("keeps handling pastes while focus is on a control inside it", async () => {
    const { adapter, names } = spyAdapter()
    render(
      <Uploader
        adapter={adapter}
        dropzone={{
          clickable: false,
          children: <Upload.Trigger>Browse</Upload.Trigger>,
        }}
      />
    )
    const trigger = screen.getByRole("button", { name: "Browse" })

    fireEvent.focus(trigger)
    paste({ files: [file("inside.png", "image/png")] }, trigger)

    await waitFor(() => expect(names).toEqual(["inside.png"]))
  })

  it("never takes a paste aimed at a text input or textarea", () => {
    const { adapter } = spyAdapter()
    render(
      <Uploader adapter={adapter} paste="global">
        <input aria-label="Title" type="text" />
        <textarea aria-label="Notes" />
        <div aria-label="Editor" role="textbox" contentEditable />
      </Uploader>
    )
    // Even with the component hovered and page-wide paste on.
    fireEvent.pointerEnter(getDropzone())

    for (const label of ["Title", "Notes", "Editor"]) {
      const field = screen.getByLabelText(label)
      field.focus()
      const event = paste({ files: [screenshot()], text: "hello" }, field)
      expect(event.defaultPrevented, label).toBe(false)
    }
    expect(itemNames()).toEqual([])
  })

  it("leaves text pastes alone", () => {
    const { adapter } = spyAdapter()
    render(<Uploader adapter={adapter} />)
    fireEvent.focus(getDropzone())

    const event = paste({ text: "just some text" })

    expect(event.defaultPrevented).toBe(false)
    expect(itemNames()).toEqual([])
  })

  it('handles pastes anywhere on the page with paste="global"', async () => {
    const { adapter, names } = spyAdapter()
    render(
      <>
        <button type="button">Elsewhere</button>
        <Uploader adapter={adapter} paste="global" />
      </>
    )
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" })
    elsewhere.focus()

    paste({ files: [file("anywhere.png", "image/png")] }, elsewhere)

    await waitFor(() => expect(names).toEqual(["anywhere.png"]))
  })

  it("gives a focused dropzone priority over a page-wide one", async () => {
    const wide = spyAdapter()
    const focused = spyAdapter()
    render(
      <>
        <Uploader adapter={wide.adapter} paste="global" />
        <Uploader
          adapter={focused.adapter}
          dropzone={{ "aria-label": "Second" }}
        />
      </>
    )

    fireEvent.focus(screen.getByRole("button", { name: "Second" }))
    paste({ files: [file("one.png", "image/png")] })

    await waitFor(() => expect(focused.names).toEqual(["one.png"]))
    // Claimed by the focused dropzone: the page-wide one must not add it too.
    expect(wide.names).toEqual([])
    expect(itemNames()).toEqual(["one.png"])
  })
})

describe("opting in", () => {
  // `paste={null}` in the helper leaves the prop unset.
  const unset = null as unknown as undefined

  it("is off by default", () => {
    const { adapter } = spyAdapter()
    render(<Uploader adapter={adapter} paste={unset} />)
    const dropzone = getDropzone()
    expect(screen.getByTestId("root").hasAttribute("data-paste")).toBe(false)
    expect(dropzone.hasAttribute("data-paste")).toBe(false)

    fireEvent.focus(dropzone)
    fireEvent.pointerEnter(dropzone)
    const event = paste({ files: [screenshot()] })

    expect(event.defaultPrevented).toBe(false)
    expect(itemNames()).toEqual([])
  })

  it("marks the component and its dropzone while paste is on", () => {
    const { adapter } = spyAdapter()
    render(<Uploader adapter={adapter} paste />)
    expect(screen.getByTestId("root").hasAttribute("data-paste")).toBe(true)
    expect(getDropzone().hasAttribute("data-paste")).toBe(true)
  })

  it("works without a dropzone: the whole component is the paste zone", async () => {
    const { adapter, names } = spyAdapter()
    render(
      <Upload.Root adapter={adapter} network={false} retry={false} paste>
        <Upload.Trigger>Add files</Upload.Trigger>
      </Upload.Root>
    )

    fireEvent.pointerEnter(screen.getByRole("button", { name: "Add files" }))
    paste({ files: [file("button.png", "image/png")] })

    await waitFor(() => expect(names).toEqual(["button.png"]))
  })

  it("turns on for every component under UploadConfigProvider paste", async () => {
    const first = spyAdapter()
    const second = spyAdapter()
    render(
      <UploadConfigProvider paste>
        <Uploader adapter={first.adapter} paste={unset} />
        <Uploader
          adapter={second.adapter}
          paste={unset}
          dropzone={{ "aria-label": "Second" }}
        />
      </UploadConfigProvider>
    )

    // Each one takes a paste only while it is the one in use.
    fireEvent.focus(screen.getByRole("button", { name: "Second" }))
    paste({ files: [file("b.png", "image/png")] })
    await waitFor(() => expect(second.names).toEqual(["b.png"]))
    expect(first.names).toEqual([])
  })

  it("lets a component's paste prop win over the provider", () => {
    const { adapter } = spyAdapter()
    render(
      <UploadConfigProvider paste="global">
        <Uploader adapter={adapter} paste={false} />
      </UploadConfigProvider>
    )
    fireEvent.focus(getDropzone())

    const event = paste({ files: [screenshot()] })

    expect(event.defaultPrevented).toBe(false)
    expect(itemNames()).toEqual([])
  })

  it("lets a nested provider change paste for its section", async () => {
    const outer = spyAdapter()
    const inner = spyAdapter()
    render(
      <UploadConfigProvider adapter={outer.adapter}>
        <Uploader adapter={outer.adapter} paste={unset} />
        <UploadConfigProvider paste="global">
          <Uploader
            adapter={inner.adapter}
            paste={unset}
            dropzone={{ "aria-label": "Inner" }}
          />
        </UploadConfigProvider>
      </UploadConfigProvider>
    )

    paste({ files: [file("anywhere.png", "image/png")] })

    await waitFor(() => expect(inner.names).toEqual(["anywhere.png"]))
    expect(outer.names).toEqual([])
  })

  it("is off while the uploader is disabled", () => {
    const { adapter } = spyAdapter()
    render(<Uploader adapter={adapter} paste="global" disabled />)
    const dropzone = getDropzone()
    expect(dropzone.hasAttribute("data-paste")).toBe(false)

    fireEvent.focus(dropzone)
    const event = paste({ files: [screenshot()] })

    expect(event.defaultPrevented).toBe(false)
    expect(itemNames()).toEqual([])
  })

  it("does not pass the prop on to the DOM or to the engine", () => {
    const { adapter } = spyAdapter()
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    render(
      <UploadConfigProvider paste>
        <Uploader adapter={adapter} paste="global" />
      </UploadConfigProvider>
    )
    expect(screen.getByTestId("root").hasAttribute("paste")).toBe(false)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})

describe("paste hooks", () => {
  it("useDropzonePaste removes its listener when disabled or unmounted", () => {
    const onPaste = vi.fn()
    const { result, rerender, unmount } = renderHook(
      (props: { enabled: boolean }) =>
        useDropzonePaste({ onPaste, enabled: props.enabled, global: true }),
      { initialProps: { enabled: true } }
    )
    expect(Object.keys(result.current.handlers).sort()).toEqual([
      "onBlur",
      "onFocus",
      "onPointerEnter",
      "onPointerLeave",
    ])

    paste({ files: [file("a.png", "image/png")] })
    expect(onPaste).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })
    paste({ files: [file("b.png", "image/png")] })
    expect(onPaste).toHaveBeenCalledTimes(1)

    rerender({ enabled: true })
    unmount()
    paste({ files: [file("c.png", "image/png")] })
    expect(onPaste).toHaveBeenCalledTimes(1)
  })

  it("usePasteFiles takes file pastes inside a composer's own textarea", () => {
    const onPaste = vi.fn()
    function Composer({ ignoreEditable }: { ignoreEditable?: boolean }) {
      const ref = React.useRef<HTMLFormElement>(null)
      usePasteFiles({ onPaste, target: ref, ignoreEditable })
      return (
        <form ref={ref}>
          <textarea aria-label="Message" />
        </form>
      )
    }
    const { rerender } = render(<Composer />)
    const textarea = screen.getByLabelText("Message")

    // Text is always left to the textarea.
    expect(paste({ text: "hi" }, textarea).defaultPrevented).toBe(false)
    expect(onPaste).not.toHaveBeenCalled()

    paste({ files: [screenshot()] }, textarea)
    expect(onPaste).toHaveBeenCalledTimes(1)
    expect(onPaste.mock.calls[0]![0][0].name).toMatch(/^pasted-image-/)

    rerender(<Composer ignoreEditable />)
    paste({ files: [screenshot()] }, textarea)
    expect(onPaste).toHaveBeenCalledTimes(1)
  })
})
