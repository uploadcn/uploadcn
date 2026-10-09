import { createFromSource } from "fumadocs-core/search/server"

import { source } from "@/lib/source"

// The search index is built once at build time and served as a static file.
// The command menu downloads it when opened and searches in the browser, so
// typing never calls a server function.
export const revalidate = false

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
  // Results are ranked by relevance; the sort index would only add weight.
  sort: { enabled: false },
  // Every page title, description and section heading, so results link
  // straight to the right section. Paragraph text is left out: it would
  // quadruple the download for little gain in a docs command menu.
  buildIndex(page) {
    return {
      id: page.url,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      structuredData: {
        headings: page.data.structuredData.headings,
        contents: [],
      },
    }
  },
})
