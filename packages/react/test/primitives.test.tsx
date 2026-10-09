import {
  type UploadAdapter,
  type UploadAdapterContext,
  UploadError,
} from "@uploadcn/core"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Upload, mergeProps, useUploader } from "../src"

afterEach(cleanup)

interface Call {
  context: UploadAdapterContext
  resolve: (value?: unknown) => void
  reject: (error: unknown) => void
}

function controlledAdapter(resumable = false) {
  const calls: Call[] = []
  const adapter: UploadAdapter = {
    name: "controlled",
    resumable,
    upload: (context) =>
      new Promise((resolve, reject) => {
        calls.push({ context, resolve, reject })
        context.signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
        )
      }),
  }
  return { adapter, calls }
}

const file = (name: string, type = "text/plain") =>
  new File(["hello"], name, { type, lastModified: 1 })

function selectFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, "files", { value: files, configurable: true })
  fireEvent.change(input)
}

function Basic(
  props: Partial<React.ComponentProps<typeof Upload.Root>> & {
    adapter: UploadAdapter
  }
) {
  return (
    <Upload.Root
      network={false}
      retry={false}
      {...(props as object)}
      adapter={props.adapter}
    >
      <Upload.Dropzone>Drop files</Upload.Dropzone>
      <Upload.List>
        {(item) => (
          <Upload.Item item={item} data-testid={`item-${item.name}`}>
            <Upload.Name />
            <Upload.Status />
            <Upload.Progress>
              <Upload.ProgressIndicator />
            </Upload.Progress>
            <Upload.Error />
            <Upload.Retry>Retry</Upload.Retry>
            <Upload.Pause>Pause</Upload.Pause>
            <Upload.Remove>Remove</Upload.Remove>
          </Upload.Item>
        )}
      </Upload.List>
      <Upload.Empty>No files yet</Upload.Empty>
    </Upload.Root>
  )
}

describe("Upload primitives", () => {
  it("adds selected files, shows progress and completes", async () => {
    const { adapter, calls } = controlledAdapter()
    const { container } = render(
      <Basic adapter={adapter} progressInterval={0} />
    )
    expect(screen.getByText("No files yet")).toBeTruthy()

    selectFiles(container, [file("a.txt")])
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(screen.queryByText("No files yet")).toBeNull()
    expect(screen.getByText("Uploading")).toBeTruthy()

    act(() => calls[0]!.context.onProgress(2, 5))
    const bar = screen.getByRole("progressbar", {
      name: "Upload progress for a.txt",
    })
    expect(bar.getAttribute("aria-valuenow")).toBe("40")
    expect(bar.getAttribute("aria-valuetext")).toBe("40%")

    await act(async () => calls[0]!.resolve({ key: "uploads/a.txt" }))
    await waitFor(() => expect(screen.getByText("Uploaded")).toBeTruthy())
    expect(screen.getByTestId("item-a.txt").getAttribute("data-status")).toBe(
      "success"
    )
  })

  it("announces results in a polite live region", async () => {
    const { adapter, calls } = controlledAdapter()
    const { container } = render(<Basic adapter={adapter} />)
    selectFiles(container, [file("report.pdf", "application/pdf")])
    await waitFor(() => expect(calls).toHaveLength(1))
    await act(async () => calls[0]!.resolve())
    const status = await screen.findByText("report.pdf uploaded")
    expect(status.getAttribute("aria-live")).toBe("polite")
  })

  it("shows retry only for failed uploads and retries on click", async () => {
    const { adapter, calls } = controlledAdapter()
    const { container } = render(<Basic adapter={adapter} />)
    selectFiles(container, [file("a.txt")])
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(
      screen.queryByRole("button", { name: "Retry upload of a.txt" })
    ).toBeNull()

    await act(async () =>
      calls[0]!.reject(
        new UploadError("Server exploded", { code: "http", status: 500 })
      )
    )
    await screen.findByText("Server exploded")
    fireEvent.click(
      screen.getByRole("button", { name: "Retry upload of a.txt" })
    )
    await waitFor(() => expect(calls).toHaveLength(2))
  })

  it("renders validation errors for rejected files", async () => {
    const { adapter } = controlledAdapter()
    const { container } = render(<Basic adapter={adapter} accept="image/*" />)
    selectFiles(container, [file("notes.txt")])
    await screen.findByText(/File type not allowed/, { selector: "p" })
    expect(screen.getByText("Rejected")).toBeTruthy()
  })

  it("only offers pause for resumable adapters", async () => {
    const plain = controlledAdapter(false)
    const { container, unmount } = render(<Basic adapter={plain.adapter} />)
    selectFiles(container, [file("a.txt")])
    await waitFor(() => expect(plain.calls).toHaveLength(1))
    expect(screen.queryByRole("button", { name: /Pause/ })).toBeNull()
    unmount()

    const resumable = controlledAdapter(true)
    const second = render(<Basic adapter={resumable.adapter} />)
    selectFiles(second.container, [file("b.txt")])
    await waitFor(() => expect(resumable.calls).toHaveLength(1))
    fireEvent.click(
      screen.getByRole("button", { name: "Pause upload of b.txt" })
    )
    expect(await screen.findByText("Paused")).toBeTruthy()
  })

  it("removes items", async () => {
    const { adapter, calls } = controlledAdapter()
    const { container } = render(<Basic adapter={adapter} />)
    selectFiles(container, [file("a.txt")])
    await waitFor(() => expect(calls).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Remove a.txt" }))
    expect(calls[0]!.context.signal.aborted).toBe(true)
    expect(await screen.findByText("No files yet")).toBeTruthy()
  })

  it("replaces the file in single-file mode", async () => {
    const { adapter, calls } = controlledAdapter()
    const { container } = render(<Basic adapter={adapter} multiple={false} />)
    selectFiles(container, [file("first.txt")])
    await waitFor(() => expect(calls).toHaveLength(1))
    selectFiles(container, [file("second.txt")])
    await waitFor(() => expect(screen.queryByText("first.txt")).toBeNull())
    expect(screen.getByText("second.txt")).toBeTruthy()
  })
})

describe("UploadDropzone", () => {
  it("is keyboard accessible and opens the file picker", () => {
    const { adapter } = controlledAdapter()
    const { container } = render(<Basic adapter={adapter} />)
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!
    const click = vi.spyOn(input, "click")
    const dropzone = screen.getByRole("button", { name: "Drop files" })
    expect(dropzone.getAttribute("tabindex")).toBe("0")
    fireEvent.keyDown(dropzone, { key: "Enter" })
    fireEvent.keyDown(dropzone, { key: " " })
    fireEvent.click(dropzone)
    expect(click).toHaveBeenCalledTimes(3)
  })

  it("reflects drag state and accepts dropped files", async () => {
    const { adapter, calls } = controlledAdapter()
    render(<Basic adapter={adapter} accept="image/*" />)
    const dropzone = screen.getByRole("button", { name: "Drop files" })
    const png = file("photo.png", "image/png")
    const dataTransfer = {
      types: ["Files"],
      items: [
        { kind: "file", type: "image/png", webkitGetAsEntry: () => null },
      ],
      files: [png],
      dropEffect: "none",
    }

    fireEvent.dragEnter(dropzone, { dataTransfer })
    expect(dropzone.hasAttribute("data-dragging")).toBe(true)
    expect(dropzone.hasAttribute("data-drag-reject")).toBe(false)

    fireEvent.drop(dropzone, { dataTransfer })
    expect(dropzone.hasAttribute("data-dragging")).toBe(false)
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.context.file.name).toBe("photo.png")
  })

  it("flags drags of unsupported types", () => {
    const { adapter } = controlledAdapter()
    render(<Basic adapter={adapter} accept="image/*" />)
    const dropzone = screen.getByRole("button", { name: "Drop files" })
    fireEvent.dragEnter(dropzone, {
      dataTransfer: {
        types: ["Files"],
        items: [{ kind: "file", type: "application/zip" }],
        files: [],
      },
    })
    expect(dropzone.hasAttribute("data-drag-reject")).toBe(true)
  })

  it("ignores non-file drags such as text selections", () => {
    const { adapter } = controlledAdapter()
    render(<Basic adapter={adapter} />)
    const dropzone = screen.getByRole("button", { name: "Drop files" })
    fireEvent.dragEnter(dropzone, {
      dataTransfer: { types: ["text/plain"], items: [], files: [] },
    })
    expect(dropzone.hasAttribute("data-dragging")).toBe(false)
  })
})

describe("rendering behavior", () => {
  it("re-renders only the item whose progress changed", async () => {
    const { adapter, calls } = controlledAdapter()
    const renders: Record<string, number> = {}
    function Counter({ name }: { name: string }) {
      renders[name] = (renders[name] ?? 0) + 1
      return null
    }
    const { container } = render(
      <Upload.Root adapter={adapter} network={false} progressInterval={0}>
        <Upload.List>
          {(item) => (
            <Upload.Item item={item}>
              <Counter name={item.name} />
            </Upload.Item>
          )}
        </Upload.List>
      </Upload.Root>
    )
    selectFiles(container, [file("a.txt"), file("b.txt")])
    await waitFor(() => expect(calls).toHaveLength(2))
    const before = { ...renders }
    act(() => calls[0]!.context.onProgress(3, 5))
    expect(renders["a.txt"]).toBeGreaterThan(before["a.txt"]!)
    expect(renders["b.txt"]).toBe(before["b.txt"])
  })

  it("submits successful upload values through hidden inputs", async () => {
    const { adapter, calls } = controlledAdapter()
    const { container } = render(
      <form>
        <Upload.Root adapter={adapter} network={false} name="attachments" />
      </form>
    )
    selectFiles(container, [file("a.txt")])
    await waitFor(() => expect(calls).toHaveLength(1))
    await act(async () => calls[0]!.resolve({ key: "uploads/a.txt" }))
    await waitFor(() => {
      const hidden = container.querySelector<HTMLInputElement>(
        'input[name="attachments"]'
      )
      expect(hidden?.value).toBe("uploads/a.txt")
    })
  })

  it("supports an external uploader and the render prop", async () => {
    const { adapter, calls } = controlledAdapter()
    function External() {
      const uploader = useUploader({ adapter, network: false })
      return (
        <Upload.Root uploader={uploader}>
          <Upload.Trigger render={<a href="#browse" className="custom" />}>
            Browse
          </Upload.Trigger>
          <button
            type="button"
            onClick={() => void uploader.add([file("x.txt")])}
          >
            Add programmatically
          </button>
        </Upload.Root>
      )
    }
    render(<External />)
    const trigger = screen.getByText("Browse")
    expect(trigger.tagName).toBe("A")
    expect(trigger.className).toBe("custom")
    fireEvent.click(screen.getByText("Add programmatically"))
    await waitFor(() => expect(calls).toHaveLength(1))
  })
})

describe("UploadList templates", () => {
  it("renders a template per item with the item in context", async () => {
    const { adapter, calls } = controlledAdapter()
    const { container } = render(
      <Upload.Root adapter={adapter} network={false}>
        <Upload.List>
          <Upload.Item data-testid="row">
            <Upload.Name />
            <Upload.Status />
          </Upload.Item>
        </Upload.List>
      </Upload.Root>
    )
    selectFiles(container, [file("one.txt"), file("two.txt")])
    await waitFor(() => expect(calls).toHaveLength(2))
    const rows = screen.getAllByTestId("row")
    expect(rows.map((row) => row.querySelector("span")?.textContent)).toEqual([
      "one.txt",
      "two.txt",
    ])
    expect(rows[0]!.getAttribute("data-status")).toBe("uploading")
  })
})

describe("mergeProps", () => {
  it("chains handlers, joins classNames and lets overrides cancel defaults", () => {
    const base = vi.fn()
    const override = vi.fn()
    const merged = mergeProps(
      { onClick: base, className: "a", style: { color: "red" }, id: "x" },
      { onClick: override, className: "b", style: { margin: 0 }, id: "y" }
    )
    ;(merged.onClick as (e: object) => void)({ defaultPrevented: false })
    expect(override).toHaveBeenCalledOnce()
    expect(base).toHaveBeenCalledOnce()
    expect(merged.className).toBe("a b")
    expect(merged.style).toEqual({ color: "red", margin: 0 })
    expect(merged.id).toBe("y")

    ;(merged.onClick as (e: object) => void)({ defaultPrevented: true })
    expect(base).toHaveBeenCalledOnce()
  })
})
