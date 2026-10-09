import { DocsLayout } from "fumadocs-ui/layouts/notebook"

import { baseOptions } from "@/lib/layout.shared"
import { source } from "@/lib/source"

export default function Layout({ children }: LayoutProps<"/docs">) {
  const options = baseOptions()
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...options}
      nav={{ ...options.nav, mode: "top" }}
      tabMode="navbar"
      sidebar={{
        collapsible: false,
        // No background prefetch of every visible sidebar link (about 300 KB
        // per page view); a click fetches just the one page, from the CDN.
        prefetch: false,
        className: "docs-sidebar md:layout:[--fd-sidebar-width:240px]",
      }}
    >
      {children}
    </DocsLayout>
  )
}
