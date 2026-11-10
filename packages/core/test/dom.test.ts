import { describe, expect, it } from "vitest"

import { getClipboardFiles, isEditableTarget } from "../src"

const NOW = new Date(2026, 10, 10, 14, 30, 52)

/** What a browser hands over on paste: files, or only items for bitmaps. */
function clipboard(files: File[], { itemsOnly = false } = {}) {
  return {
    files: itemsOnly ? [] : files,
    items: [
      { kind: "string", type: "text/plain", getAsFile: () => null },
      ...files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
    ],
    types: ["Files"],
  } as unknown as DataTransfer
}

const png = (name: string, lastModified = NOW.getTime()) =>
  new File(["png"], name, { type: "image/png", lastModified })

describe("getClipboardFiles", () => {
  it("returns nothing without clipboard data or files", () => {
    expect(getClipboardFiles(null)).toEqual([])
    expect(getClipboardFiles(undefined)).toEqual([])
    expect(getClipboardFiles(clipboard([]))).toEqual([])
  })

  it("names an image that has no file name", () => {
    const [file] = getClipboardFiles(clipboard([png("")]), { now: NOW })
    expect(file!.name).toBe("pasted-image-20261110-143052.png")
    expect(file!.type).toBe("image/png")
    expect(file!.size).toBe(3)
  })

  it("renames the generic image.png browsers give a pasted screenshot", () => {
    const [file] = getClipboardFiles(clipboard([png("image.png")]), {
      now: NOW,
    })
    expect(file!.name).toBe("pasted-image-20261110-143052.png")
  })

  it("keeps a real file that happens to be called image.png", () => {
    const yesterday = NOW.getTime() - 86_400_000
    const copied = png("image.png", yesterday)
    const [file] = getClipboardFiles(clipboard([copied]), { now: NOW })
    expect(file).toBe(copied)
  })

  it("keeps the names of files copied from the file manager", () => {
    const report = new File(["%PDF"], "report.pdf", {
      type: "application/pdf",
      lastModified: NOW.getTime(),
    })
    const photo = png("holiday.png")
    expect(getClipboardFiles(clipboard([report, photo]), { now: NOW })).toEqual(
      [report, photo]
    )
  })

  it("gives several unnamed images distinct names", () => {
    const jpeg = new File(["jpg"], "", {
      type: "image/jpeg",
      lastModified: NOW.getTime(),
    })
    const names = getClipboardFiles(clipboard([png(""), jpeg, png("")]), {
      now: NOW,
    }).map((file) => file.name)
    expect(names).toEqual([
      "pasted-image-20261110-143052.png",
      "pasted-image-20261110-143052-2.jpg",
      "pasted-image-20261110-143052-3.png",
    ])
  })

  it("names unnamed data that is not an image", () => {
    const blob = new File(["%PDF"], "", { type: "application/pdf" })
    const unknown = new File(["?"], "", { type: "" })
    const names = getClipboardFiles(clipboard([blob, unknown]), {
      now: NOW,
    }).map((file) => file.name)
    expect(names).toEqual([
      "pasted-file-20261110-143052.pdf",
      "pasted-file-20261110-143052-2",
    ])
  })

  it("falls back to clipboard items when files is empty", () => {
    const [file] = getClipboardFiles(
      clipboard([png("")], { itemsOnly: true }),
      { now: NOW }
    )
    expect(file!.name).toBe("pasted-image-20261110-143052.png")
  })
})

describe("isEditableTarget", () => {
  const element = (tagName: string, extra: Record<string, unknown> = {}) =>
    ({ tagName, closest: () => null, ...extra }) as unknown as EventTarget

  it("is true for text inputs, textareas and selects", () => {
    expect(isEditableTarget(element("TEXTAREA"))).toBe(true)
    expect(isEditableTarget(element("SELECT"))).toBe(true)
    expect(isEditableTarget(element("INPUT"))).toBe(true)
    for (const type of ["text", "search", "email", "url", "password", "number"])
      expect(isEditableTarget(element("INPUT", { type })), type).toBe(true)
  })

  it("is false for inputs nobody types in", () => {
    for (const type of [
      "checkbox",
      "radio",
      "file",
      "button",
      "submit",
      "range",
    ])
      expect(isEditableTarget(element("INPUT", { type })), type).toBe(false)
  })

  it("is true for contenteditable elements and their children", () => {
    expect(isEditableTarget(element("DIV", { isContentEditable: true }))).toBe(
      true
    )
    const editor = { getAttribute: () => "true" }
    expect(isEditableTarget(element("SPAN", { closest: () => editor }))).toBe(
      true
    )
    const off = { getAttribute: () => "false" }
    expect(isEditableTarget(element("SPAN", { closest: () => off }))).toBe(
      false
    )
  })

  it("is false for everything else", () => {
    expect(isEditableTarget(null)).toBe(false)
    expect(isEditableTarget(undefined)).toBe(false)
    expect(isEditableTarget(element("DIV"))).toBe(false)
    expect(isEditableTarget(element("BUTTON"))).toBe(false)
    expect(isEditableTarget({} as EventTarget)).toBe(false)
  })
})
