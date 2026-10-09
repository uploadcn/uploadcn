import Link from "next/link"

import { Logo } from "@/components/logo"
import { siteConfig } from "@/lib/site"

const linkClass =
  "text-muted-foreground transition-colors hover:text-foreground"

const columns = [
  {
    title: "Project",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Examples", href: "/examples" },
      { label: "Installation", href: "/docs/installation" },
      { label: "llms.txt", href: "/llms.txt" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "GitHub", href: siteConfig.links.github },
      { label: "npm", href: siteConfig.links.npm },
      { label: "Releases", href: `${siteConfig.links.github}/releases` },
      {
        label: "Contributing",
        href: `${siteConfig.links.github}/blob/main/CONTRIBUTING.md`,
      },
    ],
  },
  {
    title: "Maker",
    links: [
      { label: "hanzala.me", href: siteConfig.author.url },
      { label: `@${siteConfig.author.handle}`, href: siteConfig.author.github },
    ],
  },
]

export function SiteFooter() {
  const { author } = siteConfig
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
        <div className="flex max-w-md flex-col gap-4">
          <Link href="/" aria-label={`${siteConfig.name} home`}>
            <Logo />
          </Link>
          <p className="text-sm text-pretty text-muted-foreground">
            Designed and built by{" "}
            <a
              href={author.url}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {author.name}
            </a>
            , who has dragged more files into dropzones than anyone ever should,
            so you only have to build yours once.
          </p>
          <p className="text-sm text-pretty text-muted-foreground">
            Free and open source under MIT, standing on the shoulders of{" "}
            <a
              href="https://ui.shadcn.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              shadcn/ui
            </a>
            .
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3"
        >
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <p className="font-medium">{column.title}</p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("/") ? (
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {author.name}. MIT licensed.
          </p>
          <p>Your files go straight to your bucket. Never through ours.</p>
        </div>
      </div>
    </footer>
  )
}
