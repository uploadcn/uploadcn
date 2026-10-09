import type * as React from "react"
import { ArrowRightIcon, CornerDownRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Frame({
  className,
  children,
  label,
}: {
  className?: string
  children: React.ReactNode
  label: string
}) {
  return (
    <figure
      aria-label={label}
      className={cn(
        "not-prose my-6 overflow-x-auto rounded-xl border bg-card p-4 text-card-foreground sm:p-6",
        className
      )}
    >
      {children}
    </figure>
  )
}

function Chip({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-background px-1.5 py-0.5 font-mono text-xs",
        className
      )}
    >
      {children}
    </span>
  )
}

/** The package stack: what you own, what you install, what runs where. */
export function ArchitectureDiagram() {
  const layers = [
    {
      name: "Your app",
      note: "copied by the shadcn CLI, you own it",
      detail: (
        <span className="flex flex-wrap gap-1">
          <Chip>components/ui/upload.tsx</Chip>
          <Chip>components/file-upload.tsx</Chip>
          <Chip>…</Chip>
        </span>
      ),
      tone: "border-primary/40 bg-primary/5",
    },
    {
      name: "@uploadcn/react",
      note: "npm package",
      detail: "Hooks and headless, accessible primitives",
    },
    {
      name: "@uploadcn/core",
      note: "npm package · no React, no framework",
      detail: "Engine · queue · retries · validation · adapters · image",
    },
  ]
  return (
    <Frame
      label="Architecture"
      className="grid gap-4 md:grid-cols-[1fr_auto_15rem] md:items-center"
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Browser
        </span>
        {layers.map((layer) => (
          <div
            key={layer.name}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border bg-background p-3",
              layer.tone
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-mono text-sm font-medium">
                {layer.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {layer.note}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {layer.detail}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center text-muted-foreground md:flex-col md:gap-1">
        <span className="text-xs">bytes go direct</span>
        <ArrowRightIcon className="size-4 rotate-90 md:rotate-0" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Server (optional)
        </span>
        <div className="flex flex-col gap-1.5 rounded-lg border bg-background p-3">
          <span className="font-mono text-sm font-medium">
            @uploadcn/server
          </span>
          <span className="text-sm text-muted-foreground">
            Signs uploads, checks auth and limits. Any runtime.
          </span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Storage
        </span>
        <div className="flex flex-wrap gap-1">
          {[
            "S3",
            "R2",
            "MinIO",
            "Cloudinary",
            "Disk",
            "Your API",
            "Browser only",
          ].map((name) => (
            <Chip key={name} className="font-sans">
              {name}
            </Chip>
          ))}
        </div>
      </div>
    </Frame>
  )
}

export interface FlowStep {
  label: string
  note?: string
  highlight?: boolean
}

/** A left-to-right sequence of steps, with optional side branches. */
export function Flow({
  label = "Flow",
  steps,
  branches,
}: {
  label?: string
  steps: (string | FlowStep)[]
  /** Shown under the flow: `{ from: "scanning", to: "rejected" }`. */
  branches?: { from: string; to: string; note?: string }[]
}) {
  const normalized = steps.map((step) =>
    typeof step === "string" ? { label: step } : step
  )
  return (
    <Frame label={label} className="flex flex-col gap-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {normalized.map((step, index) => (
          <li key={step.label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex flex-col rounded-lg border bg-background px-2.5 py-1.5",
                step.highlight && "border-primary/50 bg-primary/5"
              )}
            >
              <span className="text-sm font-medium">{step.label}</span>
              {step.note ? (
                <span className="text-xs text-muted-foreground">
                  {step.note}
                </span>
              ) : null}
            </span>
            {index < normalized.length - 1 ? (
              <ArrowRightIcon
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            ) : null}
          </li>
        ))}
      </ol>
      {branches?.length ? (
        <ul className="flex flex-col gap-1.5 border-t pt-3">
          {branches.map((branch) => (
            <li
              key={`${branch.from}-${branch.to}`}
              className="flex flex-wrap items-center gap-1.5 text-sm"
            >
              <CornerDownRightIcon
                aria-hidden
                className="size-3.5 text-muted-foreground"
              />
              <span className="font-medium">{branch.from}</span>
              <ArrowRightIcon
                aria-hidden
                className="size-3.5 text-muted-foreground"
              />
              <span className="font-medium">{branch.to}</span>
              {branch.note ? (
                <span className="text-muted-foreground">, {branch.note}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Frame>
  )
}

export interface SequenceMessage {
  from: number
  to: number
  label: string
  note?: string
}

/** A swim-lane sequence diagram: who talks to whom, in order. */
export function Sequence({
  label = "Sequence",
  actors,
  messages,
}: {
  label?: string
  actors: string[]
  messages: SequenceMessage[]
}) {
  const columns = `repeat(${actors.length}, minmax(0, 1fr))`
  return (
    <Frame label={label}>
      <div className="min-w-lg">
        <div
          className="grid gap-2 border-b pb-2"
          style={{ gridTemplateColumns: columns }}
        >
          {actors.map((actor) => (
            <span key={actor} className="text-center text-sm font-medium">
              {actor}
            </span>
          ))}
        </div>
        <ol className="relative">
          {/* Lifelines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid"
            style={{ gridTemplateColumns: columns }}
          >
            {actors.map((actor) => (
              <span key={actor} className="mx-auto w-px bg-border" />
            ))}
          </div>
          {messages.map((message, index) => {
            const start = Math.min(message.from, message.to)
            const end = Math.max(message.from, message.to)
            const reverse = message.to < message.from
            const self = message.from === message.to
            return (
              <li
                key={index}
                className="relative grid py-2.5"
                style={{ gridTemplateColumns: columns }}
              >
                <div
                  className={cn(
                    "flex flex-col items-center gap-1",
                    !self && "px-[calc(50%/var(--span))]"
                  )}
                  style={
                    {
                      gridColumn: self
                        ? `${start + 1} / span 1`
                        : `${start + 1} / ${end + 2}`,
                      "--span": end - start + 1,
                    } as React.CSSProperties
                  }
                >
                  <span className="rounded-md bg-card px-1.5 text-center text-xs sm:text-sm">
                    <span className="me-1 font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    {message.label}
                  </span>
                  {message.note ? (
                    <span className="bg-card px-1.5 text-center text-xs text-muted-foreground">
                      {message.note}
                    </span>
                  ) : null}
                  {self ? null : (
                    <span
                      aria-hidden
                      className={cn(
                        "relative h-px w-full bg-foreground/70",
                        "after:absolute after:top-1/2 after:size-0 after:-translate-y-1/2 after:border-y-4 after:border-y-transparent",
                        reverse
                          ? "after:left-0 after:border-r-6 after:border-r-foreground/70"
                          : "after:right-0 after:border-l-6 after:border-l-foreground/70"
                      )}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </Frame>
  )
}

export interface TreeNode {
  name: string
  description?: string
  children?: TreeNode[]
}

function TreeItems({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => (
        <li
          key={node.name}
          className="relative ps-5 before:absolute before:top-0 before:left-1.5 before:h-full before:w-px before:bg-border after:absolute after:top-4 after:left-1.5 after:h-px after:w-2.5 after:bg-border last:before:h-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 py-1">
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">
              {node.name}
            </code>
            {node.description ? (
              <span className="text-sm text-muted-foreground">
                {node.description}
              </span>
            ) : null}
          </div>
          {node.children?.length ? <TreeItems nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  )
}

/** A component tree: how parts nest, with what each one does. */
export function ComponentTree({
  label = "Component tree",
  root,
}: {
  label?: string
  root: TreeNode
}) {
  return (
    <Frame label={label}>
      <div className="flex flex-wrap items-baseline gap-x-3 pb-1">
        <code className="rounded-md bg-primary px-1.5 py-0.5 font-mono text-[0.8125rem] text-primary-foreground">
          {root.name}
        </code>
        {root.description ? (
          <span className="text-sm text-muted-foreground">
            {root.description}
          </span>
        ) : null}
      </div>
      {root.children ? <TreeItems nodes={root.children} /> : null}
    </Frame>
  )
}
