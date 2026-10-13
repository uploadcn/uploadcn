import Link from "next/link"

import { sponsorsFor } from "@/lib/sponsors"

/**
 * Next to every docs page: sidebar sponsors when there are any, otherwise an
 * invitation to sponsor (an in-house promotion, allowed next to ad networks).
 */
export function SponsorCard() {
  const sidebar = sponsorsFor("sidebar")

  if (sidebar.length > 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Sponsored by</p>
        {sidebar.map((sponsor) => (
          <a
            key={sponsor.name}
            href={sponsor.url}
            target="_blank"
            rel="noopener sponsored"
            className="rounded-md p-1 transition-opacity hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sponsor.logo} alt={sponsor.name} className="h-7 w-auto" />
          </a>
        ))}
      </div>
    )
  }

  return (
    <Link
      href="/sponsors"
      className="group flex flex-col gap-1 rounded-lg border border-dashed p-3 text-xs transition-colors hover:bg-muted/50"
    >
      <span className="font-medium text-foreground">Sponsor UploadCN</span>
      <span className="text-pretty text-muted-foreground">
        Put your logo in front of developers choosing how their app uploads
        files.
      </span>
    </Link>
  )
}
