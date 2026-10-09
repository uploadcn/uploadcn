"use client"

import * as React from "react"
import {
  formatBytes,
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  useUploadContext,
  useUploadProgress,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Upload, UploadDropzone } from "@/registry/default/ui/upload"

interface VinylUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

const GROOVES = [98, 90, 82, 74, 66, 58, 50]

/**
 * For music and podcasts: the record spins up while tracks upload and coasts
 * to a stop when they're done, and the tonearm moves across the record with
 * the progress.
 */
function VinylUpload<TResult = unknown>({
  adapter,
  uploader,
  accept = "audio/*",
  className,
  ...options
}: VinylUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, accept, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-sm items-center gap-4", className)}
    >
      <UploadDropzone
        variant="muted"
        className="size-64 rounded-full bg-transparent p-0 hover:bg-transparent data-dragging:bg-transparent data-dragging:ring-0"
      >
        <Turntable />
      </UploadDropzone>
      <TrackList />
    </Upload>
  )
}

function Turntable() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const percent = summary.isComplete ? 100 : summary.percent
  const playing = summary.isUploading && !reduceMotion

  // The record has momentum: it spins up, then coasts down.
  const rotation = useMotionValue(0)
  const speed = useSpring(0, { stiffness: 30, damping: 18 })
  React.useEffect(() => {
    speed.set(playing ? 1 : 0)
  }, [speed, playing])
  useAnimationFrame((_, delta) => {
    const velocity = speed.get()
    if (velocity > 0.002)
      rotation.set((rotation.get() + velocity * delta * 0.2) % 360)
  })

  // The tonearm rests off the record, then tracks inwards with progress.
  const idle = summary.total === 0
  const arm = useSpring(idle ? 28 : 0, { stiffness: 70, damping: 18 })
  React.useEffect(() => {
    const target = idle ? 28 : -percent * 0.2
    if (reduceMotion) arm.jump(target)
    else arm.set(target)
  }, [arm, idle, percent, reduceMotion])
  const armRotate = useTransform(arm, (value) => `rotate(${value} 214 30)`)

  return (
    <div className="relative size-64 transition-transform duration-300 group-data-dragging/upload-dropzone:scale-105 motion-reduce:transition-none">
      <svg viewBox="0 0 240 240" className="size-full" aria-hidden>
        <circle cx="120" cy="120" r="118" className="fill-muted" />
        <motion.g style={{ rotate: rotation }}>
          <circle
            cx="120"
            cy="120"
            r="106"
            className="fill-foreground dark:fill-background"
          />
          {GROOVES.map((radius) => (
            <circle
              key={radius}
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              strokeWidth="1"
              className="stroke-background/15 dark:stroke-foreground/15"
            />
          ))}
          {/* A sheen, so the spin is visible */}
          <path
            d="M120 22 A98 98 0 0 1 205 71"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-background/20 dark:stroke-foreground/20"
          />
          <circle cx="120" cy="120" r="36" className="fill-primary" />
          <circle
            cx="120"
            cy="96"
            r="3"
            className="fill-primary-foreground/60"
          />
        </motion.g>
        <motion.g transform={armRotate}>
          <circle
            cx="214"
            cy="30"
            r="12"
            className="fill-muted-foreground/40"
          />
          <circle cx="214" cy="30" r="5" className="fill-muted-foreground" />
          <path
            d="M214 30 L196 150 L176 176"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-muted-foreground"
          />
          <rect
            x="166"
            y="170"
            width="18"
            height="12"
            rx="3"
            transform="rotate(-50 175 176)"
            className="fill-muted-foreground"
          />
        </motion.g>
      </svg>
      <div className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground">
        {idle ? (
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="Add01Icon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
            className="size-6"
          />
        ) : summary.isComplete ? (
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="size-6"
          />
        ) : (
          <span className="text-sm font-semibold tabular-nums">
            {Math.round(percent)}%
          </span>
        )}
      </div>
      <span className="sr-only">
        {idle
          ? "Add tracks: drop audio files or click to browse"
          : "Add more tracks"}
      </span>
    </div>
  )
}

function TrackList() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter((item) => item.status !== "cancelled")
  )
  const summary = useUploadProgress(uploader)
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Drop tracks on the record, or click it
      </p>
    )
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <ol className="flex flex-col divide-y rounded-xl border bg-card">
        {items.map((item, index) => (
          <Track key={item.id} item={item} index={index} />
        ))}
      </ol>
      <p
        className="text-center text-xs text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        Side A · {summary.counts.success} of {summary.total} tracks ·{" "}
        {formatBytes(summary.loaded)} of {formatBytes(summary.size)}
      </p>
    </div>
  )
}

function Track({ item, index }: { item: UploadItemData; index: number }) {
  const reduceMotion = useReducedMotion()
  const playing = item.status === "uploading" && !reduceMotion
  const failed = item.status === "error" || item.status === "rejected"
  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {item.file.name.replace(/\.[^.]+$/, "")}
      </span>
      <span aria-hidden className="flex h-3.5 items-end gap-0.5">
        {[0.5, 1, 0.7].map((height, bar) => (
          <motion.span
            key={bar}
            className={cn(
              "w-0.5 rounded-full bg-primary",
              !playing && "bg-muted-foreground/40"
            )}
            style={{ height: "100%", originY: 1 }}
            initial={false}
            animate={
              playing
                ? { scaleY: [height, 0.25, 1, height] }
                : { scaleY: item.status === "success" ? 0.35 : 0.2 }
            }
            transition={
              playing
                ? { duration: 0.9, repeat: Infinity, delay: bar * 0.15 }
                : { duration: 0.2 }
            }
          />
        ))}
      </span>
      <span
        className={cn(
          "w-10 text-right text-xs text-muted-foreground tabular-nums",
          failed && "text-destructive"
        )}
      >
        {failed
          ? "Failed"
          : item.status === "success"
            ? "Done"
            : `${Math.round(item.progress.percent)}%`}
      </span>
    </li>
  )
}

export { VinylUpload, type VinylUploadProps }
