import { sponsorsFor } from "@/lib/sponsors"
import { cn } from "@/lib/utils"

/** Sponsor logos for a placement; renders nothing until there are sponsors. */
export function SponsorLogos({
  placement,
  title = "Sponsored by",
  className,
}: {
  placement: "home" | "footer"
  title?: string
  className?: string
}) {
  const list = sponsorsFor(placement)
  if (list.length === 0) return null
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {list.map((sponsor) => (
          <a
            key={sponsor.name}
            href={sponsor.url}
            target="_blank"
            rel="noopener sponsored"
            className="transition-opacity hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sponsor.logo}
              alt={sponsor.name}
              className={placement === "home" ? "h-9 w-auto" : "h-6 w-auto"}
            />
          </a>
        ))}
      </div>
    </div>
  )
}
