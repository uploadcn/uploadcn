"use client"

import * as React from "react"
import {
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
import { motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

interface LiquidDropzoneProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Show the queue under the dropzone. Default `true`. */
  showQueue?: boolean
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A dropzone that fills up like a glass: the liquid level is the combined
 * upload progress, with a gently moving surface.
 */
function LiquidDropzone<TResult = unknown>({
  adapter,
  uploader,
  showQueue = true,
  className,
  ...options
}: LiquidDropzoneProps<TResult>) {
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
      <UploadDropzone
        variant="outline"
        size="lg"
        className="min-h-56 overflow-hidden"
        render={(props, state) => (
          <div {...props}>
            <Liquid dragging={state.isDragging} />
            {props.children as React.ReactNode}
          </div>
        )}
      >
        <LiquidLabel />
      </UploadDropzone>
      {showQueue ? <UploadQueue size="sm" variant="muted" /> : null}
    </Upload>
  )
}

const WAVE =
  "M0 12 C 50 0, 100 24, 150 12 S 250 0, 300 12 S 400 24, 450 12 S 550 0, 600 12 V 40 H 0 Z"

function Liquid({ dragging }: { dragging: boolean }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const level = summary.isUploading
    ? summary.percent
    : summary.isComplete
      ? 100
      : dragging
        ? 12
        : 0

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0"
      initial={false}
      animate={{
        height: `${level}%`,
        opacity: level === 0 ? 0 : summary.isComplete && !dragging ? 0.55 : 1,
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", bounce: 0, duration: 0.8 }
      }
    >
      <div className="absolute inset-x-0 -top-2.5 h-3 overflow-hidden">
        {[0, 1].map((layer) => (
          <motion.svg
            key={layer}
            viewBox="0 0 300 40"
            preserveAspectRatio="none"
            className={cn(
              "absolute top-0 left-0 h-6 w-[200%]",
              layer === 0 ? "fill-primary/15" : "fill-primary/10"
            )}
            animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: layer === 0 ? 4 : 6.5,
            }}
          >
            <path d={WAVE} />
          </motion.svg>
        ))}
      </div>
      <div className="size-full bg-primary/15" />
    </motion.div>
  )
}

function LiquidLabel() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  return (
    <div className="relative flex flex-col items-center gap-2">
      {summary.isUploading ? (
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {Math.round(summary.percent)}%
        </span>
      ) : (
        <span className="flex size-11 items-center justify-center rounded-full border bg-background shadow-xs transition-transform duration-300 group-hover/upload-dropzone:-translate-y-0.5 group-data-dragging/upload-dropzone:scale-110">
          <IconPlaceholder
            lucide="DropletIcon"
            tabler="IconDroplet"
            hugeicons="DropletIcon"
            phosphor="DropIcon"
            remixicon="RiDropLine"
            className="size-4"
          />
        </span>
      )}
      <UploadDropzoneTitle>
        {summary.isUploading
          ? `Filling up… ${summary.counts.uploading + summary.counts.queued} left`
          : summary.isComplete
            ? "All files uploaded"
            : "Pour your files in"}
      </UploadDropzoneTitle>
      <UploadDropzoneDescription>
        Drag files here or click to browse
      </UploadDropzoneDescription>
    </div>
  )
}

export { LiquidDropzone, type LiquidDropzoneProps }
