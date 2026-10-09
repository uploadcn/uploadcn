import type * as React from "react"
import {
  CodeBlock,
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
  Pre,
} from "fumadocs-ui/components/codeblock"
import { TerminalIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Code blocks in the shadcn style: a quiet, borderless surface with the
 * title in a header row and the copy button on the right.
 */
export const codeBlockClassName =
  "rounded-xl border-0 bg-code shadow-none [&_figcaption]:border-border/60 [&_figcaption]:text-[0.8rem]"

export function DocsPre({
  className,
  ...props
}: React.ComponentProps<typeof CodeBlock>) {
  return (
    <CodeBlock {...props} className={cn(codeBlockClassName, className)}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  )
}

export function DocsCodeBlockTabs({
  className,
  ...props
}: React.ComponentProps<typeof CodeBlockTabs>) {
  return (
    <CodeBlockTabs
      {...props}
      className={cn(
        "overflow-hidden rounded-xl border-0 bg-code [&_figure]:!m-0 [&_figure]:!rounded-none [&_figure]:!bg-transparent",
        className as string
      )}
    />
  )
}

export function DocsCodeBlockTabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CodeBlockTabsList>) {
  return (
    <CodeBlockTabsList
      {...props}
      className={cn(
        "items-center gap-1 border-b border-border/60 px-3 py-2",
        className as string
      )}
    >
      <span className="me-1 flex size-5 items-center justify-center rounded-sm bg-foreground text-background">
        <TerminalIcon className="size-3" aria-hidden />
      </span>
      {children}
    </CodeBlockTabsList>
  )
}

export function DocsCodeBlockTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof CodeBlockTabsTrigger>) {
  return (
    <CodeBlockTabsTrigger
      {...props}
      className={cn(
        "rounded-md px-2 py-0.5 font-mono text-[0.8rem] font-normal data-active:bg-background data-active:text-foreground data-active:shadow-xs [&>div:first-child]:hidden",
        className as string
      )}
    />
  )
}

export { CodeBlockTab as DocsCodeBlockTab }
