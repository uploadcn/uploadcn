import { siteConfig } from "@/lib/site"

/** Absolute URL on the site, for canonical links, sitemaps and JSON-LD. */
export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString()
}

/** The generated Open Graph image of a docs page (built at build time). */
export function docsImage(slugs: string[]) {
  return `/og/docs/${[...slugs, "image.png"].join("/")}`
}

/** The Markdown version of a docs page, for LLMs and answer engines. */
export function docsMarkdown(slugs: string[]) {
  return `/llms.mdx/docs/${[...slugs, "content.md"].join("/")}`
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
  const trail = [
    { name: "Docs", url: "/docs" },
    ...page.crumbs,
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
          ...(crumb.url ? { item: absoluteUrl(crumb.url) } : {}),
        })),
      },
    ],
  }
}
