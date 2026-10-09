"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { type SearchClient, useDocsSearch } from "fumadocs-core/search/client"
import type { SharedProps } from "fumadocs-ui/contexts/search"
import {
  CheckIcon,
  CircleDashedIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  HashIcon,
  SearchIcon,
  TextIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"

import type { SearchEntry } from "@/lib/search-index"
import { cn } from "@/lib/utils"

const EntriesContext = React.createContext<SearchEntry[]>([])

/** Provides the page index (built on the server) to the command menu. */
export function SearchEntriesProvider({
  entries,
  children,
}: {
  entries: SearchEntry[]
  children: React.ReactNode
}) {
  return <EntriesContext value={entries}>{children}</EntriesContext>
}

interface Row {
  id: string
  url: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon: React.ReactNode
  install?: string
}

interface Group {
  heading: string
  rows: Row[]
}

/**
 * Full-text search runs in the browser against a static index built at
 * deploy time: no server call per keystroke. The search engine and the
 * index load the first time someone types, not with the page.
 */
let engine: Promise<SearchClient> | undefined
const loadEngine = () =>
  (engine ??= import("fumadocs-core/search/client/orama-static").then(
    ({ staticClient }) => staticClient({ from: "/api/search" })
  ))
const client: SearchClient = {
  async search(query) {
    return (await loadEngine()).search(query)
  },
}

/** Starts downloading the index as soon as the menu opens. */
function warmSearch() {
  void loadEngine()
    .then((loaded) => loaded.search("upload"))
    .catch(() => {
      // Retried on the next search; the title results still work.
      engine = undefined
    })
}
const noop = () => () => {}

/** Scores how well `entry` matches the query, 0 means no match. */
function score(entry: SearchEntry, query: string) {
  const title = entry.title.toLowerCase()
  if (title === query) return 100
  if (title.startsWith(query)) return 80
  if (title.includes(query)) return 60
  const words = query.split(/\s+/).filter(Boolean)
  const haystack = `${title} ${entry.group.toLowerCase()} ${entry.description?.toLowerCase() ?? ""}`
  if (words.every((word) => haystack.includes(word))) return 40
  // Letters in order, e.g. "upbt" finds "Upload Button".
  let index = 0
  for (const char of title) if (char === query[index]) index++
  return index === query.length ? 20 : 0
}

/** Bolds the part of `text` that matches the query. */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-foreground">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  )
}

/**
 * Renders a search result snippet. Results mark matches with `<mark>`; the
 * text is split on those tags and rendered as plain text, never as HTML.
 */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  "#x27": "'",
  "#x22": '"',
}

/** Plain text of a result: entities decoded, Markdown syntax removed. */
function plain(value: string) {
  return value
    .replace(
      /&(#x?[0-9a-f]+|[a-z]+);/gi,
      (entity, name: string) => ENTITIES[name.toLowerCase()] ?? entity
    )
    .replace(/\*\*|__|`/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
}

/** Results that are MDX components (`<TypeTable …>`) say nothing useful. */
const isMarkup = (value: React.ReactNode) =>
  typeof value === "string" && /^\s*<(?!mark>)/.test(plain(value))

function Snippet({ value }: { value: React.ReactNode }) {
  if (typeof value !== "string") return value
  const clean = plain(value)
  return clean.split(/<mark>(.*?)<\/mark>/g).map((part, index) =>
    index % 2 ? (
      <mark
        key={index}
        className="bg-transparent font-semibold text-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-background px-1 font-sans text-[0.7rem] font-medium text-muted-foreground select-none [&_svg]:size-3">
      {children}
    </kbd>
  )
}

/**
 * The docs command menu, modelled on ui.shadcn.com: every page grouped like
 * the sidebar, instant title matching, full-text results from the docs, and
 * a copy shortcut for install commands.
 */
export function CommandMenu({ open, onOpenChange, dialogHandle }: SharedProps) {
  const entries = React.use(EntriesContext)
  const router = useRouter()
  React.useEffect(() => {
    if (open) warmSearch()
  }, [open])
  const listId = React.useId()
  const listRef = React.useRef<HTMLDivElement>(null)
  const { search, setSearch, query } = useDocsSearch({ client, delayMs: 120 })
  const [active, setActive] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const mod = React.useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl"
  )

  const term = search.trim().toLowerCase()

  const groups = React.useMemo<Group[]>(() => {
    const toRow = (entry: SearchEntry): Row => ({
      id: entry.url,
      url: entry.url,
      title: <Highlight text={entry.title} query={term} />,
      icon:
        entry.kind === "component" ? <CircleDashedIcon /> : <FileTextIcon />,
      install: entry.install,
    })

    const byGroup = new Map<string, { best: number; rows: [number, Row][] }>()
    for (const entry of entries) {
      const value = term ? score(entry, term) : 1
      if (!value) continue
      const group = byGroup.get(entry.group) ?? { best: 0, rows: [] }
      group.best = Math.max(group.best, value)
      group.rows.push([value, toRow(entry)])
      byGroup.set(entry.group, group)
    }

    let result = [...byGroup].map(([heading, group]) => ({
      heading,
      best: group.best,
      rows: term
        ? group.rows.sort((a, b) => b[0] - a[0]).map(([, row]) => row)
        : group.rows.map(([, row]) => row),
    }))
    if (term) result = result.sort((a, b) => b.best - a.best)

    const titled = new Set(
      result.flatMap((group) => group.rows.map((row) => row.url))
    )
    const hits = term && Array.isArray(query.data) ? query.data : []
    const content = hits
      .filter((hit) => hit.type !== "page" || !titled.has(hit.url))
      .filter((hit) => !isMarkup(hit.content))
      .slice(0, 12)
      .map<Row>((hit) => {
        // The root folder ("Documentation") is on every result; skip it.
        const crumbs = (hit.breadcrumbs ?? []).filter(
          (crumb) => crumb !== "Documentation"
        )
        return {
          id: `content:${hit.id}`,
          url: hit.url,
          title: <Snippet value={hit.content} />,
          subtitle: crumbs.length ? (
            <span className="truncate">
              {crumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index ? " › " : null}
                  <Snippet value={crumb} />
                </React.Fragment>
              ))}
            </span>
          ) : undefined,
          icon:
            hit.type === "heading" ? (
              <HashIcon />
            ) : hit.type === "page" ? (
              <FileTextIcon />
            ) : (
              <TextIcon />
            ),
        }
      })

    return [
      ...result.map(({ heading, rows }) => ({ heading, rows })),
      ...(content.length ? [{ heading: "In the docs", rows: content }] : []),
    ]
  }, [entries, query.data, term])

  const rows = React.useMemo(
    () => groups.flatMap((group) => group.rows),
    [groups]
  )
  const current = rows.find((row) => row.id === active) ?? rows[0]

  React.useEffect(() => {
    if (!current) return
    document
      .getElementById(`${listId}-${current.id}`)
      ?.scrollIntoView({ block: "nearest" })
  }, [current, listId])

  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const go = (row: Row) => {
    onOpenChange(false)
    router.push(row.url)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!rows.length) return
    const index = Math.max(
      0,
      rows.findIndex((row) => row.id === current?.id)
    )
    const move = (to: number) => {
      event.preventDefault()
      setActive(rows[(to + rows.length) % rows.length]!.id)
    }
    if (event.key === "ArrowDown") move(index + 1)
    else if (event.key === "ArrowUp") move(index - 1)
    else if (event.key === "Home" && event.ctrlKey) move(0)
    else if (event.key === "End" && event.ctrlKey) move(rows.length - 1)
    else if (event.key === "Enter" && current) {
      event.preventDefault()
      go(current)
    } else if (
      event.key === "c" &&
      (event.metaKey || event.ctrlKey) &&
      current?.install &&
      event.currentTarget.selectionStart === event.currentTarget.selectionEnd
    ) {
      event.preventDefault()
      void navigator.clipboard
        .writeText(current.install)
        .then(() => setCopied(true))
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setSearch("")
      }}
      handle={dialogHandle}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:bg-black/20" />
        <Dialog.Popup
          aria-label="Search documentation"
          className="fixed top-[12vh] left-1/2 z-50 flex max-h-[min(36rem,76vh)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 transition-[opacity,scale] duration-150 outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
        >
          <Dialog.Title className="sr-only">Search documentation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search pages, components and guides. Use the arrow keys to move and
            Enter to open.
          </Dialog.Description>
          <div className="p-2 pb-0">
            <div className="flex h-10 items-center gap-2 rounded-lg border bg-input/30 px-3 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/30">
              <SearchIcon
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <input
                autoFocus
                role="combobox"
                aria-expanded
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={
                  current ? `${listId}-${current.id}` : undefined
                }
                aria-label="Search documentation"
                placeholder="Search documentation..."
                spellCheck={false}
                autoComplete="off"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setActive(null)
                  listRef.current?.scrollTo({ top: 0 })
                }}
                onKeyDown={onKeyDown}
                className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query.isLoading && term ? (
                <span
                  aria-hidden
                  className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                />
              ) : null}
            </div>
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Results"
            className="min-h-0 flex-1 scroll-py-2 overflow-y-auto p-2"
          >
            {groups.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {query.isLoading ? "Searching…" : "No results found."}
              </p>
            ) : (
              groups.map((group, groupIndex) => (
                <div
                  key={group.heading}
                  role="group"
                  aria-labelledby={`${listId}-g${groupIndex}`}
                  className="pb-1"
                >
                  <div
                    id={`${listId}-g${groupIndex}`}
                    className="px-3 pt-2 pb-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {group.heading}
                  </div>
                  {group.rows.map((row) => {
                    const selected = row.id === current?.id
                    return (
                      <div
                        key={row.id}
                        id={`${listId}-${row.id}`}
                        role="option"
                        aria-selected={selected}
                        onPointerMove={() => !selected && setActive(row.id)}
                        onClick={() => go(row)}
                        className={cn(
                          "flex min-h-9 cursor-default items-center gap-3 rounded-md px-3 py-1.5 text-sm select-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
                          selected && "bg-accent text-accent-foreground"
                        )}
                      >
                        {row.icon}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{row.title}</span>
                          {row.subtitle ? (
                            <span className="flex text-xs text-muted-foreground">
                              {row.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex h-11 shrink-0 items-center gap-4 border-t bg-muted/50 px-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeftIcon />
              </Kbd>
              Go to page
            </span>
            {current?.install ? (
              <span className="flex items-center gap-1.5">
                <Kbd>{mod}</Kbd>
                <Kbd>C</Kbd>
                {copied ? (
                  <span className="flex items-center gap-1 text-foreground">
                    <CheckIcon className="size-3" /> Copied
                  </span>
                ) : (
                  "Copy install command"
                )}
              </span>
            ) : null}
            <span className="ms-auto hidden items-center gap-1.5 sm:flex">
              <Kbd>Esc</Kbd>
              Close
            </span>
          </div>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Install command copied" : ""}
          </span>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
