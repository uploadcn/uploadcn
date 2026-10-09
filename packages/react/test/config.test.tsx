import { createAdapter, localAdapter } from "@uploadcn/core"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it } from "vitest"

import { Upload, UploadConfigProvider } from "../src"

afterEach(cleanup)

const file = (name: string) =>
  new File(["hello"], name, { type: "text/plain", lastModified: 1 })

function selectFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector<HTMLInputElement>(
    'input[type="file"]:not([hidden])'
  )!
  Object.defineProperty(input, "files", { value: files, configurable: true })
  fireEvent.change(input)
}

describe("UploadConfigProvider", () => {
  it("supplies the adapter and defaults to every uploader below it", async () => {
    const uploaded: string[] = []
    const adapter = createAdapter(async ({ file }) => {
      uploaded.push(file.name)
      return { ok: true }
    })
    const { container } = render(
      <UploadConfigProvider adapter={adapter} maxFiles={1}>
        <Upload.Root>
          <Upload.List>
            {(item) => <span data-status={item.status}>{item.name}</span>}
          </Upload.List>
        </Upload.Root>
      </UploadConfigProvider>
    )
    selectFiles(container, [file("a.txt")])
    await waitFor(() =>
      expect(container.querySelector('[data-status="success"]')).not.toBeNull()
    )
    expect(uploaded).toEqual(["a.txt"])
  })

  it("lets component props win over the provider", async () => {
    const fromProvider = createAdapter(async () => "provider")
    const fromProp = createAdapter(async () => "prop")
    const results: unknown[] = []
    const { container } = render(
      <UploadConfigProvider adapter={fromProvider}>
        <Upload.Root
          adapter={fromProp}
          onSuccess={(item) => results.push(item.result)}
        />
      </UploadConfigProvider>
    )
    selectFiles(container, [file("b.txt")])
    await waitFor(() => expect(results).toEqual(["prop"]))
  })

  it("renders without an adapter and explains how to configure storage", async () => {
    const logged: unknown[] = []
    const error = console.error
    console.error = (message: unknown) => logged.push(message)
    try {
      const failures: string[] = []
      const { container } = render(
        <Upload.Root onError={(_item, e) => failures.push(e.message)} />
      )
      expect(logged.join(" ")).toMatch(/UploadConfigProvider/)
      selectFiles(container, [file("a.txt")])
      await waitFor(() => expect(failures).toHaveLength(1))
      expect(failures[0]).toMatch(/UploadConfigProvider/)
    } finally {
      console.error = error
    }
  })
})

describe('submit="file"', () => {
  it("puts the selected files in the form, without uploading anywhere", async () => {
    const { container } = render(
      <form>
        <Upload.Root
          adapter={localAdapter()}
          autoUpload={false}
          name="attachments"
          submit="file"
        />
      </form>
    )
    selectFiles(container, [file("one.txt"), file("two.txt")])
    const form = container.querySelector("form")!
    await waitFor(() =>
      expect(
        new FormData(form)
          .getAll("attachments")
          .map((entry) => (entry as File).name)
      ).toEqual(["one.txt", "two.txt"])
    )
  })
})
