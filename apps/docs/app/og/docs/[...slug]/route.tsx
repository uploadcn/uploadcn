import { notFound } from "next/navigation"

import { ogImage } from "@/lib/og"
import { getPageInfo } from "@/lib/search-index"
import { source } from "@/lib/source"

// One PNG per docs page, rendered at build time and served as a static file.
export const revalidate = false
export const dynamicParams = false

export async function GET(
  _request: Request,
  { params }: RouteContext<"/og/docs/[...slug]">
) {
  const { slug } = await params
  const page = source.getPage(slug.slice(0, -1))
  if (!page) notFound()
  const info = getPageInfo(page.url)
  return ogImage({
    eyebrow: info?.group ? `Docs / ${info.group}` : "Docs",
    title: page.data.title,
    description: page.data.description,
    footer: info?.install ?? `uploadcn.dev${page.url}`,
  })
}

export function generateStaticParams() {
  return source
    .getPages()
    .map((page) => ({ slug: [...page.slugs, "image.png"] }))
}
