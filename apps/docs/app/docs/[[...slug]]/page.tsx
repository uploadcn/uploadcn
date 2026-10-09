import fs from "node:fs/promises"
import path from "node:path"

import type { Metadata } from "next"
import { findNeighbour } from "fumadocs-core/page-tree"
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/notebook/page"
import { createRelativeLink } from "fumadocs-ui/mdx"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { JsonLd } from "@/components/json-ld"
import { getMDXComponents } from "@/components/mdx"
import { Button } from "@/components/ui/button"
import { getPageInfo } from "@/lib/search-index"
import { docsImage, docsJsonLd, docsMarkdown } from "@/lib/seo"
import { siteConfig } from "@/lib/site"
import { source } from "@/lib/source"

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const markdownUrl = docsMarkdown(page.slugs)
  const info = getPageInfo(page.url)
  const neighbours = findNeighbour(source.getPageTree(), page.url)

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ style: "clerk" }}
      tableOfContentPopover={{ style: "clerk" }}
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
      // A centered 40rem column, like ui.shadcn.com.
      className="*:mx-auto *:w-full *:max-w-160 xl:pt-10"
    >
      <JsonLd
        data={docsJsonLd({
          url: page.url,
          slugs: page.slugs,
          title: page.data.title,
          description: page.data.description,
          crumbs:
            info && info.group !== "Get Started" ? [{ name: info.group }] : [],
          modified: await modifiedAt(page.path),
          install: info?.install,
        })}
      />
      <div className="flex items-start justify-between gap-4">
        <DocsTitle className="text-3xl font-semibold tracking-tight">
          {page.data.title}
        </DocsTitle>
        <div className="flex shrink-0 items-center gap-1.5 pt-1">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`${siteConfig.links.github}/blob/main/apps/docs/content/docs/${page.path}`}
          />
          {neighbours.previous ? (
            <Button
              variant="secondary"
              size="icon-sm"
              render={<Link href={neighbours.previous.url} />}
              nativeButton={false}
              aria-label={`Previous: ${String(neighbours.previous.name)}`}
              className="max-sm:hidden"
            >
              <ArrowLeftIcon />
            </Button>
          ) : null}
          {neighbours.next ? (
            <Button
              variant="secondary"
              size="icon-sm"
              render={<Link href={neighbours.next.url} />}
              nativeButton={false}
              aria-label={`Next: ${String(neighbours.next.name)}`}
              className="max-sm:hidden"
            >
              <ArrowRightIcon />
            </Button>
          ) : null}
        </div>
      </div>
      <DocsDescription className="mb-2 text-base text-balance">
        {page.data.description}
      </DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({ a: createRelativeLink(source, page) })}
        />
      </DocsBody>
      <nav
        aria-label="Pagination"
        className="flex h-16 items-center gap-2 border-t pt-4"
      >
        {neighbours.previous ? (
          <Button
            variant="secondary"
            size="sm"
            render={<Link href={neighbours.previous.url} />}
            nativeButton={false}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {neighbours.previous.name}
          </Button>
        ) : null}
        {neighbours.next ? (
          <Button
            variant="secondary"
            size="sm"
            render={<Link href={neighbours.next.url} />}
            nativeButton={false}
            className="ms-auto"
          >
            {neighbours.next.name}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        ) : null}
      </nav>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">
): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()
  const info = getPageInfo(page.url)
  const title =
    info?.kind === "component"
      ? `${page.data.title}: shadcn upload component`
      : page.data.title
  const description = page.data.description ?? siteConfig.description
  const image = {
    url: docsImage(page.slugs),
    width: 1200,
    height: 630,
    alt: `${page.data.title}, UploadCN docs`,
  }
  return {
    title,
    description,
    alternates: {
      canonical: page.url,
      types: { "text/markdown": docsMarkdown(page.slugs) },
    },
    openGraph: {
      type: "article",
      url: page.url,
      title: page.data.title,
      description,
      siteName: siteConfig.name,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description,
      images: [image],
    },
  }
}

/** When the page's source file last changed, for structured data. */
async function modifiedAt(file: string) {
  const stat = await fs
    .stat(path.join(process.cwd(), "content/docs", file))
    .catch(() => null)
  return stat?.mtime
}
