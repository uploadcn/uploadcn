import { stat } from "node:fs/promises"
import path from "node:path"

import type { MetadataRoute } from "next"

import { absoluteUrl, docsImage } from "@/lib/seo"
import { source } from "@/lib/source"

function priority(slugs: string[]) {
  if (slugs.length === 0) return 0.9
  if (["installation", "getting-started"].includes(slugs[0]!)) return 0.9
  if (slugs[0] === "components") return 0.8
  return 0.7
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const built = new Date()
  const docs = await Promise.all(
    source.getPages().map(async (page) => {
      const file = await stat(
        path.join(process.cwd(), "content/docs", page.path)
      ).catch(() => null)
      return {
        url: absoluteUrl(page.url),
        lastModified: file?.mtime ?? built,
        changeFrequency: "weekly" as const,
        priority: priority(page.slugs),
        images: [absoluteUrl(docsImage(page.slugs))],
      }
    })
  )
  return [
    {
      url: absoluteUrl("/"),
      lastModified: built,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/examples"),
      lastModified: built,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...docs,
  ]
}
