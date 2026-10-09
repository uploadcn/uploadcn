"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function InstallCommand({
  command,
  className,
}: {
  command: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(command).then(() => setCopied(true))
      }}
      className={cn(
        "group inline-flex h-10 max-w-full items-center gap-3 rounded-full border bg-background px-4 font-mono text-[0.8rem] shadow-xs transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      aria-label={copied ? "Copied" : `Copy command: ${command}`}
    >
      <span className="text-muted-foreground select-none">$</span>
      <span className="truncate">{command}</span>
      <span className="text-muted-foreground transition-colors group-hover:text-foreground">
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </span>
    </button>
  )
}
