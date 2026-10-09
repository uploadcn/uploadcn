import { cn } from "@/lib/utils"

/**
 * The UploadCN mark: a "U" whose right stroke rises into an upload arrow,
 * cut out of a squircle. Monochrome, follows the foreground color.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-5 shrink-0", className)}
    >
      <rect width="24" height="24" rx="6.5" fill="currentColor" />
      <g
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(-0.75 0)"
        className="stroke-background"
      >
        <path d="M7 9v4a5 5 0 0 0 10 0V6" />
        <path d="m14 9 3-3 3 3" />
      </g>
    </svg>
  )
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <LogoMark />
      UploadCN
    </span>
  )
}
