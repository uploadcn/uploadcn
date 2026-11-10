"use client"

import * as React from "react"
import { UploadConfigProvider } from "@uploadcn/react"
import { cn } from "cn"

interface UploadPasteProps {
  /**
   * Take file pastes from anywhere on the page, not only while the component
   * inside is focused or hovered. Use it for one uploader per page.
   */
  global?: boolean
  /** Turn paste off without removing the wrapper. */
  disabled?: boolean
  /**
   * Show the shortcut under the component: `true` for the default text, or
   * your own (translated) text.
   */
  hint?: boolean | React.ReactNode
  /** Styles the hint. */
  className?: string
  children: React.ReactNode
}

/**
 * Paste to upload for whatever is inside: wrap any upload component, block
 * or animated block, and Ctrl/⌘+V adds screenshots and copied files to it
 * while it is focused or hovered.
 *
 * Pasted files take the same path as dropped ones, so the component's own
 * `accept`, `maxSize` and `maxFiles` apply. Pastes into text inputs and
 * textareas are never touched.
 */
function UploadPaste({
  global = false,
  disabled = false,
  hint = false,
  className,
  children,
}: UploadPasteProps) {
  // Needs @uploadcn/react 0.1.5 or later; older versions ignore the setting.
  const config: { paste: boolean | "global" } = {
    paste: disabled ? false : global ? "global" : true,
  }
  if (!hint || disabled) {
    return <UploadConfigProvider {...config}>{children}</UploadConfigProvider>
  }
  return (
    <UploadConfigProvider {...config}>
      <div
        data-slot="upload-paste"
        className="flex w-full min-w-0 flex-col items-center gap-2"
      >
        {children}
        <UploadPasteHint className={className}>
          {hint === true ? undefined : hint}
        </UploadPasteHint>
      </div>
    </UploadConfigProvider>
  )
}

/** "Paste with Ctrl+V / ⌘V". Place it anywhere near an uploader. */
function UploadPasteHint({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="upload-paste-hint"
      className={cn(
        "text-center text-xs text-muted-foreground [&>kbd]:font-sans [&>kbd]:font-medium",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          Paste with <kbd>Ctrl+V</kbd> /{" "}
          <kbd>
            <span aria-hidden>⌘V</span>
            <span className="sr-only">Command V</span>
          </kbd>
        </>
      )}
    </p>
  )
}

export { UploadPaste, UploadPasteHint, type UploadPasteProps }
