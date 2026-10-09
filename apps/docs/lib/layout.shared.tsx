import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

import { DesignCustomizer } from "@/components/design/customizer"
import { Logo } from "@/components/logo"
import { siteConfig } from "@/lib/site"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
      // In nav.children (a plain flex container in every layout), not in
      // `links`, which some layouts render as <ul> items.
      children: (
        <div className="order-last ms-auto flex items-center ps-2">
          <DesignCustomizer />
        </div>
      ),
    },
    links: [
      {
        type: "icon",
        url: siteConfig.links.github,
        label: "UploadCN on GitHub",
        text: "GitHub",
        external: true,
        icon: (
          <svg viewBox="0 0 24 24" aria-hidden fill="currentColor">
            <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
          </svg>
        ),
      },
      { text: "Docs", url: "/docs", active: "nested-url" },
      { text: "Components", url: "/docs/components/upload", active: "none" },
      { text: "Examples", url: "/examples", active: "url" },
    ],
  }
}
