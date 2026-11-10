// The "new" dots in the sidebar point at real pages, and the changelog
// mentions each of them.
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { NEW_PAGES, withNewDots } from "@/lib/new-pages"

const root = path.resolve(import.meta.dirname, "../content/docs")

describe("new pages", () => {
  it.each([...NEW_PAGES])("%s exists", (url) => {
    const file = url.replace(/^\/docs\/?/, "")
    expect(
      existsSync(path.join(root, `${file}.mdx`)) ||
        existsSync(path.join(root, file, "index.mdx"))
    ).toBe(true)
  })

  it("the changelog links to every other new page", () => {
    const changelog = readFileSync(path.join(root, "changelog.mdx"), "utf8")
    for (const url of NEW_PAGES) {
      if (url !== "/docs/changelog")
        expect(changelog, url).toContain(`(${url})`)
    }
  })

  it("marks only new pages, at any depth, and leaves the source tree alone", () => {
    const page = (url: string) => ({ type: "page" as const, name: url, url })
    const tree = {
      name: "Docs",
      children: [
        page("/docs/installation"),
        page("/docs/changelog"),
        {
          type: "folder" as const,
          name: "Storage",
          index: page("/docs/storage"),
          children: [page("/docs/storage/config-generator")],
        },
      ],
    }
    const marked = withNewDots(tree)
    const [plain, changelog, folder] = marked.children as unknown as [
      { name: unknown },
      { name: unknown },
      { children: { name: unknown }[]; index: { name: unknown } },
    ]
    expect(plain.name).toBe("/docs/installation")
    expect(typeof changelog.name).toBe("object")
    expect(typeof folder.children[0]!.name).toBe("object")
    expect(folder.index.name).toBe("/docs/storage")
    // Search, breadcrumbs and the pager read plain names from the original.
    expect(tree.children[1]!.name).toBe("/docs/changelog")
  })
})
