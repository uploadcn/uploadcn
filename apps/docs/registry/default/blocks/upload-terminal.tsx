"use client"

import * as React from "react"
import {
  formatBytes,
  formatSpeed,
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  Upload as UploadPrimitive,
  useUploadContext,
  useUploadProgress,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Upload } from "@/registry/default/ui/upload"

interface UploadTerminalProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Shown in the title bar. Default `"upload"`. */
  title?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * Uploads as a CLI log: drop files on the window, and each one prints a
 * line with an ASCII progress bar, speed and result.
 */
function UploadTerminal<TResult = unknown>({
  adapter,
  uploader,
  title = "upload",
  className,
  ...options
}: UploadTerminalProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadPrimitive.Dropzone
        data-slot="upload-terminal"
        aria-label="Upload files"
        className="group/terminal dark overflow-hidden rounded-xl border bg-background font-mono text-sm leading-6 text-foreground shadow-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-dragging:border-primary"
      >
        <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-muted-foreground/40" />
            <span className="size-2.5 rounded-full bg-muted-foreground/40" />
            <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          </span>
          <span className="flex-1 text-center text-xs text-muted-foreground">
            ~/{title}
          </span>
          <span className="w-10" />
        </div>
        <Log />
      </UploadPrimitive.Dropzone>
    </Upload>
  )
}

function bar(percent: number, width = 20) {
  const filled = Math.round((percent / 100) * width)
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`
}

function Line({ item }: { item: UploadItemData }) {
  const percent = item.status === "success" ? 100 : item.progress.percent
  const status = {
    success: <span className="font-medium text-foreground">✓ done</span>,
    error: <span className="text-destructive">✗ {item.error?.message}</span>,
    rejected: (
      <span className="text-destructive">! {item.issues[0]?.message}</span>
    ),
    cancelled: <span className="text-muted-foreground">cancelled</span>,
    paused: <span className="text-muted-foreground">paused</span>,
    processing: <span className="text-muted-foreground">processing…</span>,
    scanning: <span className="text-muted-foreground">scanning…</span>,
    queued: <span className="text-muted-foreground">queued</span>,
  }[item.status as string]

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex min-w-0 flex-wrap gap-x-3"
    >
      <span className="truncate text-foreground">
        <span className="text-muted-foreground">› </span>
        {item.name}
      </span>
      <span className="text-muted-foreground">{formatBytes(item.size)}</span>
      {item.status === "uploading" ? (
        <>
          <span className="text-foreground" aria-hidden>
            {bar(percent)}
          </span>
          <span className="tabular-nums">{Math.round(percent)}%</span>
          <span className="text-muted-foreground">
            {formatSpeed(item.progress.speed)}
          </span>
        </>
      ) : (
        status
      )}
    </motion.li>
  )
}

function Cursor() {
  const reduceMotion = useReducedMotion()
  return (
    <motion.span
      aria-hidden
      className="inline-block h-4 w-2 translate-y-0.5 bg-foreground"
      animate={reduceMotion ? undefined : { opacity: [1, 1, 0, 0] }}
      transition={{ repeat: Infinity, duration: 1.1, times: [0, 0.5, 0.5, 1] }}
    />
  )
}

function Log() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)
  const summary = useUploadProgress(uploader)
  const scroller = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const element = scroller.current
    if (element) element.scrollTop = element.scrollHeight
  }, [items.length, summary.isComplete])

  return (
    <div ref={scroller} className="max-h-72 min-h-44 overflow-y-auto px-4 py-3">
      <p className="text-muted-foreground">
        <span className="text-foreground">$</span> uploadcn push --watch
      </p>
      <ol aria-live="polite" className="mt-1 flex flex-col">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <Line key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </ol>
      {summary.total > 0 && !summary.isUploading ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "mt-1",
            summary.hasErrors
              ? "text-destructive"
              : "font-medium text-foreground"
          )}
        >
          {summary.counts.success} uploaded
          {summary.hasErrors ? `, ${summary.counts.error} failed` : ""} ·{" "}
          {formatBytes(summary.size)}
        </motion.p>
      ) : null}
      <p className="mt-1 text-muted-foreground">
        {items.length === 0 ? (
          <span className="mr-2">
            drop files here, or{" "}
            <span className="text-foreground underline underline-offset-4">
              click to browse
            </span>
          </span>
        ) : (
          <span className="text-foreground">$ </span>
        )}
        <Cursor />
      </p>
    </div>
  )
}

export { UploadTerminal, type UploadTerminalProps }
