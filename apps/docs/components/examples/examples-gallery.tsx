"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ExampleRenderer } from "@/examples/components"
import {
  type ExampleCategory,
  type ExampleMeta,
  exampleCategories,
  examples,
} from "@/examples/meta"
import { cn } from "@/lib/utils"

type Filter = ExampleCategory | "All"

/** Mounts the live example only once the card scrolls near the viewport. */
function LazyPreview({ name }: { name: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "300px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="flex size-full items-center justify-center">
      {visible ? <ExampleRenderer name={name} /> : <Spinner />}
    </div>
  )
}

/** Copies the block's install command. Shown on hover, focus and touch. */
function CopyCommand({ command, title }: { command: string; title: string }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(command).then(() => setCopied(true))
      }
      aria-label={copied ? "Copied" : `Copy install command for ${title}`}
      title={command}
      className={cn(
        "absolute inset-x-3 top-3 z-10 flex h-8 items-center gap-2 rounded-lg border bg-background/90 px-2.5 font-mono text-xs text-muted-foreground shadow-sm backdrop-blur transition-[opacity,translate,color] outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        "-translate-y-1 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
        copied && "translate-y-0 text-foreground opacity-100"
      )}
    >
      <TerminalIcon aria-hidden className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{command}</span>
      {copied ? (
        <CheckIcon aria-hidden className="size-3.5 shrink-0" />
      ) : (
        <CopyIcon aria-hidden className="size-3.5 shrink-0" />
      )}
      <span role="status" className="sr-only">
        {copied ? "Install command copied" : ""}
      </span>
    </button>
  )
}

function ExampleCard({
  example,
  install,
}: {
  example: ExampleMeta
  install?: string
}) {
  return (
    <li
      data-slot="example-card"
      className="group/card relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs transition-[box-shadow,border-color] hover:border-ring/40 hover:shadow-md"
    >
      <div
        inert
        aria-hidden
        className="relative h-72 overflow-hidden bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px] p-6"
      >
        <div className="flex size-full [zoom:0.8] items-center justify-center">
          <LazyPreview name={example.name} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-card to-transparent" />
      </div>
      {install ? <CopyCommand command={install} title={example.title} /> : null}
      <div className="flex items-start justify-between gap-3 border-t px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={example.href}
            className="font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {example.title}
          </Link>
          <p className="text-sm text-muted-foreground">{example.description}</p>
        </div>
        <ArrowUpRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" />
      </div>
    </li>
  )
}

export function ExamplesGallery({
  installs,
}: {
  /** Install command per example name, for blocks in the registry. */
  installs: Record<string, string>
}) {
  const [filter, setFilter] = React.useState<Filter>("All")
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const visible = examples.filter(
    (example) =>
      (filter === "All" || example.category === filter) &&
      (!needle ||
        example.title.toLowerCase().includes(needle) ||
        example.description.toLowerCase().includes(needle))
  )
  const counts = (category: Filter) =>
    category === "All"
      ? examples.length
      : examples.filter((example) => example.category === category).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          role="tablist"
          aria-label="Categories"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
        >
          {(["All", ...exampleCategories] as Filter[]).map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={filter === category}
              onClick={() => setFilter(category)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                filter === category
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {category}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  filter === category
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {counts(category)}
              </span>
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search examples"
            placeholder="Search examples…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No examples match “{query}”.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((example) => (
            <ExampleCard
              key={example.name}
              example={example}
              install={installs[example.name]}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
