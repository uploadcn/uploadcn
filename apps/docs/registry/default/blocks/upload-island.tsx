"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  Upload as UploadPrimitive,
  UploadItemContext,
  useUploadContext,
  useUploadProgress,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Upload, UploadItemMedia } from "@/registry/default/ui/upload"

interface UploadIslandProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A Dynamic Island for uploads: a pill that morphs between idle, uploading
 * and done, and expands into the file list on hover. Click it to browse,
 * or drop files on it.
 */
function UploadIsland<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: UploadIslandProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={cn("items-center", className)}
    >
      <Island />
    </Upload>
  )
}

function RingProgress({ percent }: { percent: number }) {
  const radius = 9
  const circumference = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        strokeWidth="3"
        className="stroke-background/20"
      />
      <motion.circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        className="stroke-background"
        initial={false}
        animate={{ strokeDashoffset: circumference * (1 - percent / 100) }}
        transition={{ ease: "easeOut", duration: 0.3 }}
      />
    </svg>
  )
}

function Island() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const items = useUploadSelector(uploader, (state) => state.items)
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = React.useState(false)

  const active =
    items.find((item) => item.status === "uploading") ?? items.at(-1)
  const phase = summary.isUploading
    ? "uploading"
    : summary.total > 0
      ? "done"
      : "idle"
  const open = expanded && items.length > 0
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, bounce: 0.3, duration: 0.55 }

  return (
    <UploadPrimitive.Dropzone
      data-slot="upload-island"
      data-phase={phase}
      aria-label={
        phase === "idle"
          ? "Upload files"
          : `${summary.total} files, ${Math.round(summary.percent)}% uploaded`
      }
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      render={
        <motion.div
          layout
          transition={spring}
          style={{ borderRadius: open ? 28 : 999 }}
          className={cn(
            "relative cursor-pointer overflow-hidden bg-foreground text-background shadow-lg outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
            "data-dragging:ring-4 data-dragging:ring-primary/30",
            open ? "w-80 p-3" : "w-auto px-3 py-2"
          )}
        />
      }
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.ul
            key="list"
            layout
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            <li className="flex items-center justify-between px-1 pb-1 text-xs text-background/60 tabular-nums">
              <span>
                {summary.total} file{summary.total === 1 ? "" : "s"}
              </span>
              <span>{Math.round(summary.percent)}%</span>
            </li>
            {items.slice(-4).map((item) => (
              <UploadItemContext.Provider key={item.id} value={item}>
                <li className="flex items-center gap-2.5">
                  <UploadItemMedia className="size-8 border-background/10 bg-background/10 text-background/70 [&_[data-slot=upload-item-media-badge]]:ring-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-xs font-medium">
                      {item.name}
                    </span>
                    <span className="h-1 overflow-hidden rounded-full bg-background/15">
                      <motion.span
                        className={cn(
                          "block h-full rounded-full",
                          item.status === "error" || item.status === "rejected"
                            ? "bg-destructive"
                            : "bg-background"
                        )}
                        initial={false}
                        animate={{
                          width: `${item.status === "success" ? 100 : item.progress.percent}%`,
                        }}
                      />
                    </span>
                  </div>
                </li>
              </UploadItemContext.Provider>
            ))}
          </motion.ul>
        ) : (
          <motion.div
            key={phase}
            layout
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2.5 text-sm font-medium whitespace-nowrap"
          >
            {phase === "idle" ? (
              <>
                <IconPlaceholder
                  lucide="UploadIcon"
                  tabler="IconUpload"
                  hugeicons="Upload01Icon"
                  phosphor="UploadSimpleIcon"
                  remixicon="RiUploadLine"
                  className="size-4"
                  aria-hidden
                />
                Drop or click to upload
              </>
            ) : phase === "uploading" ? (
              <>
                <RingProgress percent={summary.percent} />
                <span className="max-w-40 truncate">{active?.name}</span>
                <span className="text-background/60 tabular-nums">
                  {Math.round(summary.percent)}%
                </span>
              </>
            ) : (
              <>
                <span className="flex size-6 items-center justify-center rounded-full bg-background text-foreground">
                  <IconPlaceholder
                    lucide="CheckIcon"
                    tabler="IconCheck"
                    hugeicons="Tick02Icon"
                    phosphor="CheckIcon"
                    remixicon="RiCheckLine"
                    className="size-3.5"
                    strokeWidth={3}
                    aria-hidden
                  />
                </span>
                {summary.hasErrors
                  ? `${summary.counts.success} uploaded · ${summary.counts.error} failed`
                  : `${summary.counts.success} uploaded`}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </UploadPrimitive.Dropzone>
  )
}

export { UploadIsland, type UploadIslandProps }
