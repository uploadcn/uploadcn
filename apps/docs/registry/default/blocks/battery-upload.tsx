"use client"

import * as React from "react"
import {
  formatBytes,
  formatDuration,
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  useUploadContext,
  useUploadProgress,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"

import { Upload, UploadDropzone } from "@/registry/default/ui/upload"

interface BatteryUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** What is being backed up, e.g. "photos". Default "files". */
  noun?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

const CELLS = 5

/**
 * For device and photo backups: a battery charges cell by cell as files
 * upload, with a pulsing bolt while it's charging and a full glow when the
 * backup is done.
 */
function BatteryUpload<TResult = unknown>({
  adapter,
  uploader,
  noun = "files",
  accept = ["image/*", "video/*"],
  className,
  ...options
}: BatteryUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, accept, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-sm items-center gap-5", className)}
    >
      <UploadDropzone
        variant="muted"
        className="h-44 rounded-2xl bg-transparent p-0 hover:bg-muted/40 data-dragging:bg-muted/60"
      >
        <Battery />
      </UploadDropzone>
      <BatteryCaption noun={noun} />
    </Upload>
  )
}

function Battery() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const percent = summary.isComplete ? 100 : summary.percent
  const level = useSpring(percent, { stiffness: 80, damping: 20 })
  React.useEffect(() => {
    if (reduceMotion) level.jump(percent)
    else level.set(percent)
  }, [level, percent, reduceMotion])
  const label = useTransform(level, (value) => `${Math.round(value)}`)
  const charging = summary.isUploading
  const failed = summary.hasErrors && !summary.isUploading

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center transition-transform duration-300 group-data-dragging/upload-dropzone:scale-105 motion-reduce:transition-none">
        <motion.div
          className={cn(
            "relative flex h-24 w-56 gap-1.5 rounded-2xl border-4 border-foreground p-1.5",
            summary.isComplete && "shadow-lg shadow-primary/30"
          )}
          animate={
            summary.isComplete && !reduceMotion
              ? { scale: [1, 1.04, 1] }
              : undefined
          }
          transition={{ duration: 0.5 }}
        >
          {Array.from({ length: CELLS }, (_, index) => (
            <Cell key={index} index={index} level={level} failed={failed} />
          ))}
          <AnimatePresence>
            {charging ? (
              <motion.svg
                key="bolt"
                viewBox="0 0 24 24"
                aria-hidden
                className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={
                  reduceMotion
                    ? { opacity: 1, scale: 1 }
                    : { opacity: [0.85, 1, 0.85], scale: [1, 1.12, 1] }
                }
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
                transition={{
                  duration: 1.1,
                  repeat: reduceMotion ? 0 : Infinity,
                }}
              >
                <path
                  d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  className="fill-background stroke-foreground"
                />
              </motion.svg>
            ) : null}
          </AnimatePresence>
        </motion.div>
        <div className="h-9 w-2.5 rounded-r-md bg-foreground" />
      </div>
      <div className="flex items-baseline text-3xl font-semibold tracking-tight tabular-nums">
        <motion.span>{label}</motion.span>
        <span className="text-base text-muted-foreground">%</span>
      </div>
      <span className="sr-only">
        Drop files to back them up, or click to choose
      </span>
    </div>
  )
}

function Cell({
  index,
  level,
  failed,
}: {
  index: number
  level: ReturnType<typeof useSpring>
  failed: boolean
}) {
  const share = 100 / CELLS
  const fill = useTransform(level, (value) =>
    Math.min(1, Math.max(0, (value - index * share) / share))
  )
  return (
    <div className="relative flex-1 overflow-hidden rounded-md bg-muted">
      <motion.div
        className={cn(
          "absolute inset-0 origin-left",
          failed ? "bg-destructive" : "bg-primary"
        )}
        style={{ scaleX: fill }}
      />
    </div>
  )
}

function BatteryCaption({ noun }: { noun: string }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const eta = formatDuration(summary.eta)
  return (
    <p
      className="text-center text-sm text-muted-foreground tabular-nums"
      aria-live="polite"
    >
      {summary.total === 0
        ? `Drop ${noun} to back them up, or click the battery`
        : summary.isComplete
          ? `Backup complete · ${summary.counts.success} ${noun} · ${formatBytes(summary.size)}`
          : summary.hasErrors && !summary.isUploading
            ? `${summary.counts.error} ${noun} couldn't be backed up`
            : `Backing up ${summary.counts.success} of ${summary.total} ${noun} · ${formatBytes(summary.loaded)} of ${formatBytes(summary.size)}${
                eta ? ` · ${eta} left` : ""
              }`}
    </p>
  )
}

export { BatteryUpload, type BatteryUploadProps }
