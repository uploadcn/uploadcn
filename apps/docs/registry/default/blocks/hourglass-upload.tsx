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

interface HourglassUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

// Hourglass geometry (viewBox 120 × 180)
const TOP = 22
const NECK = 90
const BOTTOM = 158
const BULB = NECK - TOP

/**
 * For long uploads and deadlines: sand runs from the top bulb to the bottom
 * as the upload progresses, and the time left is front and center.
 */
function HourglassUpload<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: HourglassUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-xs items-center gap-4", className)}
    >
      <UploadDropzone
        variant="muted"
        className="h-64 w-48 rounded-3xl bg-transparent p-0 hover:bg-muted/40 data-dragging:bg-muted/60"
      >
        <Hourglass />
      </UploadDropzone>
      <TimeLeft />
    </Upload>
  )
}

function Hourglass() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const id = `hourglass${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const percent = summary.isComplete ? 100 : summary.percent
  const sand = useSpring(percent, { stiffness: 50, damping: 18 })
  React.useEffect(() => {
    if (reduceMotion) sand.jump(percent)
    else sand.set(percent)
  }, [sand, percent, reduceMotion])

  // Top sand drains from the surface down; bottom sand piles up.
  const topY = useTransform(sand, (value) => TOP + (value / 100) * BULB)
  const bottomY = useTransform(sand, (value) => BOTTOM - (value / 100) * BULB)
  const flowing = summary.isUploading && percent < 100
  const done = summary.isComplete

  return (
    <motion.div
      className="relative"
      animate={
        done && !reduceMotion ? { rotate: [0, -8, 6, 0] } : { rotate: 0 }
      }
      transition={{ duration: 0.8 }}
    >
      <svg viewBox="0 0 120 180" className="h-56 w-auto" aria-hidden>
        <defs>
          <clipPath id={`${id}-top`}>
            <path
              d={`M24 ${TOP} H96 C96 60 66 76 62 ${NECK} H58 C54 76 24 60 24 ${TOP} Z`}
            />
          </clipPath>
          <clipPath id={`${id}-bottom`}>
            <path
              d={`M58 ${NECK} H62 C66 104 96 120 96 ${BOTTOM} H24 C24 120 54 104 58 ${NECK} Z`}
            />
          </clipPath>
        </defs>

        {/* Sand */}
        <g clipPath={`url(#${id}-top)`}>
          <motion.rect
            x="20"
            width="80"
            height={BULB + 10}
            y={topY}
            className="fill-primary"
          />
        </g>
        <g clipPath={`url(#${id}-bottom)`}>
          <motion.rect
            x="20"
            width="80"
            height={BULB + 10}
            y={bottomY}
            className="fill-primary"
          />
        </g>
        {flowing ? (
          <motion.line
            x1="60"
            x2="60"
            y1={NECK - 2}
            y2={BOTTOM - 4}
            strokeWidth="2"
            strokeDasharray="3 5"
            className="stroke-primary"
            animate={reduceMotion ? undefined : { strokeDashoffset: [0, -16] }}
            transition={{ duration: 0.5, ease: "linear", repeat: Infinity }}
          />
        ) : null}

        {/* Glass */}
        <path
          d={`M24 ${TOP} H96 C96 60 66 76 62 ${NECK} C66 104 96 120 96 ${BOTTOM} H24 C24 120 54 104 58 ${NECK} C54 76 24 60 24 ${TOP} Z`}
          fill="none"
          strokeWidth="3"
          strokeLinejoin="round"
          className="stroke-foreground/70"
        />
        {/* Frame */}
        <rect
          x="12"
          y="8"
          width="96"
          height="14"
          rx="5"
          className="fill-foreground"
        />
        <rect
          x="12"
          y={BOTTOM}
          width="96"
          height="14"
          rx="5"
          className="fill-foreground"
        />
        <rect
          x="16"
          y="22"
          width="5"
          height={BOTTOM - 22}
          rx="2"
          className="fill-foreground/60"
        />
        <rect
          x="99"
          y="22"
          width="5"
          height={BOTTOM - 22}
          rx="2"
          className="fill-foreground/60"
        />
      </svg>
      <AnimatePresence>
        {done ? (
          <motion.span
            className="absolute -top-1 -right-3 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 18,
              delay: 0.3,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </motion.span>
        ) : null}
      </AnimatePresence>
      <span className="sr-only">Drop files or click to upload</span>
    </motion.div>
  )
}

function TimeLeft() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const eta = formatDuration(summary.eta)
  return (
    <div
      className="flex flex-col items-center gap-1 text-center"
      aria-live="polite"
    >
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {summary.total === 0
          ? "Time to upload"
          : summary.isComplete
            ? "Done in time"
            : summary.hasErrors && !summary.isUploading
              ? "Interrupted"
              : eta
                ? `${eta} left`
                : `${Math.round(summary.percent)}%`}
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {summary.total === 0
          ? "Drop files on the hourglass, or click it"
          : `${summary.counts.success} of ${summary.total} files · ${formatBytes(summary.loaded)} of ${formatBytes(summary.size)}`}
      </p>
    </div>
  )
}

export { HourglassUpload, type HourglassUploadProps }
