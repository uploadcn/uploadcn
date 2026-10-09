"use client"

import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  RotateCcwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? "Copied" : "Copy code"}
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => setCopied(true))
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}

/**
 * A live preview with its source folded underneath, like the shadcn/ui
 * docs. "Replay" remounts the example; "View code" unfolds the source.
 */
export function PreviewFrame({
  preview,
  code,
  source,
  href,
  align = "center",
  className,
}: {
  preview: React.ReactNode
  code: React.ReactNode
  source: string
  /** Full-page view of the example. */
  href?: string
  align?: "center" | "start"
  className?: string
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [run, setRun] = React.useState(0)
  const codeId = React.useId()

  return (
    <div
      data-slot="preview-frame"
      className={cn(
        "not-prose group/preview my-6 overflow-hidden rounded-xl border bg-background",
        className
      )}
    >
      <div
        className={cn(
          "relative flex min-h-80 w-full justify-center p-6 sm:p-10",
          align === "center" ? "items-center" : "items-start"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] bg-[size:18px_18px] opacity-70"
        />
        <div className="absolute top-2.5 right-2.5 z-10 flex gap-0.5 rounded-lg bg-background/80 p-0.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/preview:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Replay example"
            onClick={() => setRun((value) => value + 1)}
          >
            <RotateCcwIcon />
          </Button>
          {href ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open in new tab"
              render={<a href={href} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              <ExternalLinkIcon />
            </Button>
          ) : null}
          <CopyCodeButton code={source} />
        </div>
        <div key={run} className="relative w-full max-w-xl">
          {preview}
        </div>
      </div>
      <div className="relative border-t bg-code">
        <div
          id={codeId}
          className={cn(
            "overflow-hidden [&_figure]:my-0",
            !expanded &&
              "max-h-32 [mask-image:linear-gradient(to_bottom,black_25%,transparent)]"
          )}
          inert={!expanded}
        >
          {code}
        </div>
        <div
          className={cn(
            "flex justify-center",
            expanded
              ? "border-t border-border/60 py-2"
              : "absolute inset-x-0 bottom-4"
          )}
        >
          <Button
            variant={expanded ? "ghost" : "outline"}
            size="sm"
            className={cn(
              !expanded && "bg-background shadow-sm dark:bg-background"
            )}
            aria-expanded={expanded}
            aria-controls={codeId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Hide code" : "View code"}
            <ChevronDownIcon
              data-icon="inline-end"
              className={cn("transition-transform", expanded && "rotate-180")}
            />
          </Button>
        </div>
      </div>
    </div>
  )
}
