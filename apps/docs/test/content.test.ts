// Docs content rules: every page has valid frontmatter with a title and a
// description, internal links point at real pages, and the copy uses plain
// punctuation (no em dashes).
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { parse } from "yaml"
import { describe, expect, it } from "vitest"

const root = path.resolve(import.meta.dirname, "../content/docs")

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith(".mdx") ? [full] : []
  })

const pages = walk(root).map((file) => ({
  file: path.relative(root, file).replaceAll("\\", "/"),
  text: readFileSync(file, "utf8"),
}))

const urls = new Set(
  pages.map(
    ({ file }) =>
      "/docs/" +
      file
        .replace(/\.mdx$/, "")
        .replace(/(^|\/)index$/, "")
        .replace(/\/$/, "")
  )
)
urls.add("/docs")

describe.each(pages.map((page) => [page.file, page] as const))(
  "%s",
  (_, page) => {
    it("has valid frontmatter with a title and description", () => {
      const match = page.text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      expect(match).not.toBeNull()
      const data = parse(match![1]!) as {
        title?: unknown
        description?: unknown
      }
      expect(typeof data.title).toBe("string")
      expect(typeof data.description).toBe("string")
    })

    it("uses no em dashes", () => {
      expect(page.text.includes("—")).toBe(false)
    })

    it("links only to pages that exist", () => {
      const links = [...page.text.matchAll(/\]\((\/docs[^)#\s]*)/g)].map(
        (match) => match[1]!.replace(/\/$/, "")
      )
      expect(links.filter((link) => !urls.has(link))).toEqual([])
    })
  }
)
