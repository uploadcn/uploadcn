import type { Node } from "fumadocs-core/page-tree"

import registry from "@/registry.json"
import { source } from "@/lib/source"

export interface SearchEntry {
  title: string
  url: string
  group: string
  description?: string
  /** `npx shadcn add` command, for pages that document a registry item. */
  install?: string
  kind: "page" | "component"
}

const ITEMS = new Set(registry.items.map((item) => item.name))

/**
 * Every docs page, grouped like the sidebar, for the command menu. Built on
 * the server and passed to the client dialog, so opening it costs nothing.
 */
export function getSearchIndex(): SearchEntry[] {
  const pages = new Map(source.getPages().map((page) => [page.url, page]))
  const entries: SearchEntry[] = [
    { title: "Home", url: "/", group: "Pages", kind: "page" },
    {
      title: "Examples",
      url: "/examples",
      group: "Pages",
      description: "Every component and block, live.",
      kind: "page",
    },
  ]

  const walk = (nodes: Node[], group: string) => {
    let current = group
    for (const node of nodes) {
      if (node.type === "separator") {
        current =
          typeof node.name === "string" && node.name ? node.name : current
      } else if (node.type === "folder") {
        const name = typeof node.name === "string" ? node.name : current
        if (node.index) add(node.index.url, name)
        walk(node.children, name)
      } else {
        add(node.url, current)
      }
    }
  }

  const add = (url: string, group: string) => {
    const page = pages.get(url)
    if (!page || entries.some((entry) => entry.url === url)) return
    const slug = page.slugs.at(-1) ?? ""
    const install =
      page.slugs[0] === "components" && ITEMS.has(slug)
        ? `npx shadcn@latest add @uploadcn/${slug}`
        : undefined
    entries.push({
      title: page.data.title,
      url,
      group,
      description: page.data.description,
      install,
      kind: install ? "component" : "page",
    })
  }

  walk(source.pageTree.children, "Get Started")
  return entries
}

let byUrl: Map<string, SearchEntry> | undefined

/** Sidebar group and install command of a page, for OG images and metadata. */
export function getPageInfo(url: string) {
  byUrl ??= new Map(getSearchIndex().map((entry) => [entry.url, entry]))
  return byUrl.get(url)
}
