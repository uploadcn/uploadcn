"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadProgress,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadFileIcon,
} from "@/registry/default/ui/upload"

interface EnvelopeUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Who the files are for, shown on the envelope. */
  recipient?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * Send documents like mail: files slide into the envelope, the flap
 * closes and a seal stamps on when everything has arrived.
 */
function EnvelopeUpload<TResult = unknown>({
  adapter,
  uploader,
  recipient = "Acme Legal",
  className,
  ...options
}: EnvelopeUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={cn("items-center", className)}
    >
      <UploadDropzone
        variant="muted"
        className="w-full max-w-sm gap-5 bg-transparent hover:bg-transparent data-dragging:bg-transparent data-dragging:ring-0"
      >
        <Envelope recipient={recipient} />
      </UploadDropzone>
    </Upload>
  )
}

function Envelope({ recipient }: { recipient: string }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const letters = useUploadSelector(uploader, (state) =>
    state.items
      .filter(
        (item) => item.status !== "rejected" && item.status !== "cancelled"
      )
      .slice(-3)
  )
  const reduceMotion = useReducedMotion()
  const sealed = summary.isComplete
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, bounce: 0.25, duration: 0.6 }

  return (
    <>
      <div className="relative h-40 w-60 [perspective:900px]" aria-hidden>
        {/* Back */}
        <div className="absolute inset-x-0 bottom-0 h-32 rounded-lg bg-muted" />
        {/* Letters */}
        <AnimatePresence initial={false}>
          {letters.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ y: -90, opacity: 0, rotate: -4 }}
              animate={{
                y: sealed ? 40 : 4 - index * 10,
                opacity: 1,
                rotate: (index - 1) * 3,
              }}
              exit={{ y: -90, opacity: 0 }}
              transition={spring}
              className="absolute inset-x-6 bottom-6 flex h-28 flex-col gap-1.5 rounded-md border bg-background p-2.5 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <UploadItemContext.Provider value={item}>
                  <UploadFileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </UploadItemContext.Provider>
                <span className="truncate text-xs font-medium">
                  {item.name}
                </span>
              </div>
              <span className="h-1 w-4/5 rounded-full bg-muted" />
              <span className="h-1 w-3/5 rounded-full bg-muted" />
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Front pocket */}
        <div className="absolute inset-x-0 bottom-0 h-24 overflow-hidden rounded-lg border bg-card shadow-md">
          <div className="absolute inset-x-0 bottom-0 h-full bg-linear-to-t from-muted/60 to-transparent" />
          <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
            <span className="flex flex-col gap-0.5 text-left">
              <span className="text-xs text-muted-foreground">To</span>
              <span className="text-sm font-medium">{recipient}</span>
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {summary.total > 0 ? `${Math.round(summary.percent)}%` : ""}
            </span>
          </div>
        </div>
        {/* Flap */}
        <motion.div
          className="absolute inset-x-0 top-8 h-16 origin-top"
          initial={false}
          animate={{ rotateX: sealed ? 0 : 180 }}
          transition={spring}
          style={{ transformStyle: "preserve-3d" }}
        >
          <svg
            viewBox="0 0 240 64"
            preserveAspectRatio="none"
            className="size-full fill-card stroke-border drop-shadow-sm"
          >
            <path d="M1 1 L120 63 L239 1 Z" strokeWidth="1" />
          </svg>
        </motion.div>
        {/* Seal */}
        <AnimatePresence>
          {sealed ? (
            <motion.span
              initial={{
                scale: reduceMotion ? 1 : 2.4,
                opacity: 0,
                rotate: -20,
              }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...spring, delay: reduceMotion ? 0 : 0.35 }}
              className="absolute top-16 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background"
            >
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
                className="size-4"
                strokeWidth={3}
              />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {sealed
          ? `Sealed and sent · ${summary.total} file${summary.total === 1 ? "" : "s"}`
          : summary.isUploading
            ? `Sending ${summary.counts.uploading + summary.counts.queued} file${summary.counts.uploading + summary.counts.queued === 1 ? "" : "s"}…`
            : summary.hasErrors
              ? `${summary.counts.error} couldn't be sent, drop to try again`
              : "Drop documents into the envelope, or click"}
      </p>
    </>
  )
}

export { EnvelopeUpload, type EnvelopeUploadProps }
