import type { Metadata } from "next"

import { siteConfig } from "@/lib/site"

/** Absolute URL on the site, for canonical links, sitemaps and JSON-LD. */
export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString()
}

/** The generated Open Graph image of a docs page (built at build time). */
export function docsImage(slugs: string[]) {
  return `/og/docs/${[...slugs, "image.png"].join("/")}`
}

/** The site's share image: app/opengraph-image.png (and twitter-image.png). */
export const siteImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: `${siteConfig.name}: file uploads, built for shadcn. Drop-in blocks with a tested upload engine underneath.`,
}

/**
 * Open Graph and Twitter metadata for a page with its own title. Next merges
 * metadata shallowly, so a page's `openGraph` or `twitter` replaces the root
 * layout's whole object, share image included. Pages use this instead of
 * setting those fields by hand.
 */
export function shareMetadata({
  title,
  description,
  url,
}: {
  title: string
  description: string
  url: string
}) {
  return {
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: siteConfig.name,
      url,
      title,
      description,
      images: [siteImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteImage],
    },
  } satisfies Metadata
}

/** The Markdown version of a docs page, for LLMs and answer engines. */
export function docsMarkdown(slugs: string[]) {
  return `/llms.mdx/docs/${[...slugs, "content.md"].join("/")}`
}

/**
 * The meta description shown in search results. Docs subtitles are short on
 * purpose, so short ones get a second sentence, by section, that says what
 * the page is for in the words people search with.
 */
export function seoDescription(page: {
  slugs: string[]
  title: string
  description?: string
}) {
  const base = page.description ?? siteConfig.description
  if (base.length >= 110) return base
  const [section, slug] = page.slugs
  // Longest first; the first one that keeps the snippet within ~160
  // characters (where Google truncates) wins.
  const more: Record<string, string[]> = {
    components: [
      `A free shadcn/ui file upload component for React. Install it with npx shadcn add @uploadcn/${slug}.`,
      "A free shadcn/ui file upload component for React.",
      "A shadcn/ui upload component.",
    ],
    adapters: [
      "Upload adapters for UploadCN, open-source file upload components for shadcn/ui and React.",
      "File uploads for shadcn/ui and React.",
    ],
    storage: [
      "Storage setup for UploadCN, open-source file upload components for shadcn/ui and React.",
      "File uploads for shadcn/ui and React.",
    ],
    guides: [
      "A guide to file uploads in React with UploadCN and shadcn/ui components.",
      "File uploads in React with shadcn/ui.",
    ],
    frameworks: [
      `File upload components for shadcn/ui in ${page.title}, with UploadCN.`,
      "File uploads for shadcn/ui.",
    ],
    reference: [
      "API reference for UploadCN, file uploads for shadcn/ui and React.",
      "File uploads for shadcn/ui and React.",
    ],
  }
  const options = more[section ?? ""] ?? [
    "UploadCN: open-source file upload components for shadcn/ui, React and Next.js.",
    "File uploads for shadcn/ui and React.",
  ]
  const fit = options.find((extra) => base.length + 1 + extra.length <= 160)
  return fit ? `${base} ${fit}` : base
}

export const keywords = [
  "shadcn",
  "shadcn/ui",
  "shadcn registry",
  "file upload",
  "react file upload",
  "next.js file upload",
  "dropzone",
  "upload component",
  "s3 presigned upload",
  "cloudflare r2 upload",
  "multipart upload",
  "resumable upload",
  "image upload",
  "drag and drop upload",
  "tailwind css",
  "virus scanning",
  "ocr",
]

const organization = {
  "@type": "Organization",
  "@id": absoluteUrl("/#organization"),
  name: siteConfig.name,
  url: siteConfig.url,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/icon-512.png"),
    width: 512,
    height: 512,
  },
  sameAs: [siteConfig.links.github, siteConfig.links.npm],
}

const person = {
  "@type": "Person",
  "@id": absoluteUrl("/#author"),
  name: siteConfig.author.name,
  url: siteConfig.author.url,
  sameAs: [siteConfig.author.github],
}

const website = {
  "@type": "WebSite",
  "@id": absoluteUrl("/#website"),
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "en",
  publisher: { "@id": organization["@id"] },
}

/** Site-wide graph: the organization, the website and the software itself. */
export function siteJsonLd(faq: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      person,
      website,
      {
        "@type": "SoftwareSourceCode",
        "@id": absoluteUrl("/#software"),
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        codeRepository: siteConfig.links.github,
        programmingLanguage: ["TypeScript", "React"],
        runtimePlatform: ["Next.js", "TanStack Start", "Vite", "React Router"],
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        author: { "@id": person["@id"] },
        maintainer: { "@id": person["@id"] },
        keywords: keywords.join(", "),
      },
      {
        "@type": "FAQPage",
        "@id": absoluteUrl("/#faq"),
        mainEntity: faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  }
}

/** A docs page: a technical article with breadcrumbs. */
export function docsJsonLd(page: {
  url: string
  slugs: string[]
  title: string
  description?: string
  crumbs: { name: string; url?: string }[]
  modified?: Date
  install?: string
}) {
  const url = absoluteUrl(page.url)
  // Google requires an `item` URL on every breadcrumb, so sidebar groups
  // without a page of their own ("Components", "Guides"…) are left out.
  const trail: { name: string; url: string }[] = [
    { name: "Docs", url: "/docs" },
    ...page.crumbs.flatMap((crumb) =>
      crumb.url ? [crumb as { name: string; url: string }] : []
    ),
    { name: page.title, url: page.url },
  ]
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: page.title,
        description: page.description,
        url,
        image: absoluteUrl(docsImage(page.slugs)),
        inLanguage: "en",
        ...(page.modified ? { dateModified: page.modified.toISOString() } : {}),
        author: { "@id": organization["@id"] },
        publisher: organization,
        isPartOf: { "@id": website["@id"] },
        mainEntityOfPage: url,
        ...(page.install
          ? {
              about: {
                "@type": "SoftwareSourceCode",
                name: page.title,
                codeRepository: siteConfig.links.github,
                programmingLanguage: "TypeScript",
                runtimePlatform: "React",
                text: page.install,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: trail.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.url),
        })),
      },
    ],
  }
}
