import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

import { DesignCustomizer } from "@/components/design/customizer"
import { GitHubStars } from "@/components/github-stars"
import { Logo } from "@/components/logo"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
      // In nav.children (a plain flex container in every layout), not in
      // `links`, which some layouts render as <ul> items.
      children: (
        <div className="order-last ms-auto flex items-center gap-2 ps-2">
          <GitHubStars />
          <DesignCustomizer />
        </div>
      ),
    },
    links: [
      { text: "Docs", url: "/docs", active: "nested-url" },
      { text: "Components", url: "/docs/components/upload", active: "none" },
      { text: "Examples", url: "/examples", active: "url" },
      { text: "Sponsor", url: "/sponsors", active: "url" },
    ],
  }
}
