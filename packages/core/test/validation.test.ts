import { describe, expect, it } from "vitest"

import {
  getFileType,
  matchesAccept,
  parseAccept,
  toAcceptAttribute,
  validateFile,
  validateFileCount,
  validateFiles,
  validateFileSync,
} from "../src/validation"
import { createFile } from "./helpers"

describe("accept matching", () => {
  it("matches exact MIME types, wildcards and extensions", () => {
    const png = createFile("photo.PNG", 10, "image/png")
    expect(matchesAccept(png, "image/png")).toBe(true)
    expect(matchesAccept(png, "image/*")).toBe(true)
    expect(matchesAccept(png, ".png")).toBe(true)
    expect(matchesAccept(png, ["application/pdf", ".jpg"])).toBe(false)
    expect(matchesAccept(png, undefined)).toBe(true)
  })

  it("infers the type from the extension when the browser omits it", () => {
    const markdown = createFile("notes.md", 10, "")
    expect(getFileType(markdown)).toBe("text/markdown")
    expect(matchesAccept(markdown, "text/*")).toBe(true)
  })

  it("parses comma-separated strings and serializes the attribute", () => {
    expect(parseAccept(" image/* , .PDF ")).toEqual(["image/*", ".pdf"])
    expect(toAcceptAttribute(["image/png", ".pdf"])).toBe("image/png,.pdf")
    expect(toAcceptAttribute(undefined)).toBeUndefined()
  })
})

describe("validateFileSync", () => {
  it("reports type and size issues", () => {
    const file = createFile("a.exe", 2000, "application/x-msdownload")
    const issues = validateFileSync(file, {
      accept: "image/*",
      maxSize: 1000,
    })
    expect(issues.map((issue) => issue.code)).toEqual([
      "file-invalid-type",
      "file-too-large",
    ])
    expect(issues[1]!.message).toContain("1 KB")
  })

  it("enforces a minimum size", () => {
    const issues = validateFileSync(createFile("a.txt", 1), { minSize: 10 })
    expect(issues[0]!.code).toBe("file-too-small")
  })
})

describe("validateFile", () => {
  it("runs sync and async custom validators", async () => {
    const file = createFile("draft.txt")
    const issues = await validateFile(file, {
      validate: [
        (f) => (f.name.startsWith("draft") ? "Drafts are not allowed" : null),
        async () => ({ code: "custom", message: "Async rule" }),
      ],
    })
    expect(issues.map((issue) => issue.message)).toEqual([
      "Drafts are not allowed",
      "Async rule",
    ])
  })

  it("skips expensive checks when cheap ones already failed", async () => {
    let called = false
    await validateFile(createFile("a.txt", 5000), {
      maxSize: 10,
      validate: () => {
        called = true
      },
    })
    expect(called).toBe(false)
  })
})

describe("validateFiles", () => {
  it("accepts up to maxFiles, counting files already selected", async () => {
    const files = [createFile("a"), createFile("b"), createFile("c")]
    const result = await validateFiles(
      files,
      { maxFiles: 3 },
      { existingCount: 1 }
    )
    expect(result.accepted.map((f) => f.name)).toEqual(["a", "b"])
    expect(result.rejected[0]!.issues[0]!.code).toBe("too-many-files")
  })

  it("does not let rejected files consume slots", async () => {
    const files = [createFile("big", 100), createFile("ok", 1)]
    const result = await validateFiles(files, { maxFiles: 1, maxSize: 10 })
    expect(result.accepted.map((f) => f.name)).toEqual(["ok"])
  })
})

describe("validateFileCount", () => {
  it("validates minimum and maximum counts", () => {
    expect(validateFileCount(0, { minFiles: 1 })?.code).toBe("too-few-files")
    expect(validateFileCount(3, { maxFiles: 2 })?.code).toBe("too-many-files")
    expect(validateFileCount(2, { minFiles: 1, maxFiles: 2 })).toBeNull()
  })
})
