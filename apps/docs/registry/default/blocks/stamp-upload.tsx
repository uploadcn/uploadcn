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
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Upload, UploadDropzone } from "@/registry/default/ui/upload"

interface StampUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Text stamped on received documents. Default "Received". */
  stamp?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** Small, fixed tilts so the pile looks hand-stacked (and renders the same on the server). */
const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"]

const today = () =>
  new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

/**
 * For contracts, filings and HR paperwork: documents land on a pile, and
 * each one gets a rubber stamp the moment it's safely received.
 */
function StampUpload<TResult = unknown>({
  adapter,
  uploader,
  stamp = "Received",
  accept = [".pdf", ".doc", ".docx", "image/*"],
  className,
  ...options
}: StampUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, accept, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-sm gap-4", className)}
    >
      <UploadDropzone
        variant="muted"
        className="h-80 rounded-2xl bg-muted/50 p-0"
      >
        <Pile stamp={stamp} />
      </UploadDropzone>
    </Upload>
  )
}

function Pile({ stamp }: { stamp: string }) {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter((item) => item.status !== "cancelled")
  )
  const visible = items.slice(-4)
  const received = items.filter((item) => item.status === "success").length

  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-4 p-6">
      <div className="relative h-52 w-40">
        {visible.length === 0 ? (
          <div className="absolute inset-0 flex flex-col gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 bg-background/60 p-4">
            {[90, 70, 80, 50].map((width) => (
              <span
                key={width}
                className="h-1.5 rounded-full bg-muted"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((item, index) => (
              <Paper
                key={item.id}
                item={item}
                stamp={stamp}
                depth={visible.length - 1 - index}
                tilt={
                  TILTS[(items.length - visible.length + index) % TILTS.length]!
                }
              />
            ))}
          </AnimatePresence>
        )}
      </div>
      <p
        className="text-center text-sm text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        {items.length === 0
          ? "Drop documents to file them, or click"
          : `${received} of ${items.length} received`}
      </p>
    </div>
  )
}

function Paper({
  item,
  stamp,
  depth,
  tilt,
}: {
  item: UploadItemData
  stamp: string
  depth: number
  tilt: string
}) {
  const reduceMotion = useReducedMotion()
  const done = item.status === "success"
  const failed = item.status === "error" || item.status === "rejected"
  const [date] = React.useState(today)

  return (
    <motion.div
      className={cn(
        "absolute inset-0 flex flex-col gap-2 overflow-hidden rounded-md border bg-card p-4 text-left shadow-md",
        depth > 0 && tilt
      )}
      style={{ zIndex: 10 - depth }}
      initial={reduceMotion ? false : { y: -60, opacity: 0, scale: 0.95 }}
      animate={{
        y: depth * 6,
        x: depth * 4,
        opacity: depth > 2 ? 0.6 : 1,
        scale: 1 - depth * 0.03,
      }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <span className="truncate text-xs font-medium">{item.file.name}</span>
      <span className="text-xs text-muted-foreground">
        {formatBytes(item.file.size)}
      </span>
      {[95, 80, 88, 60, 75].map((width) => (
        <span
          key={width}
          className="h-1.5 rounded-full bg-muted"
          style={{ width: `${width}%` }}
        />
      ))}
      {!done && !failed ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-muted">
          <div
            className="h-full origin-left bg-primary transition-transform"
            style={{ transform: `scaleX(${item.progress.percent / 100})` }}
          />
        </div>
      ) : null}
      <AnimatePresence>
        {done || failed ? (
          <motion.div
            key="stamp"
            className={cn(
              "absolute right-3 bottom-6 flex -rotate-12 flex-col items-center rounded-md border-4 px-2 py-1 font-mono leading-none font-bold uppercase",
              failed
                ? "border-destructive text-destructive"
                : "border-primary text-primary"
            )}
            initial={reduceMotion ? { opacity: 0 } : { scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.9 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 500, damping: 18 }
            }
          >
            <span className="text-sm tracking-widest">
              {failed ? "Returned" : stamp}
            </span>
            <span className="mt-1 text-xs font-medium">{date}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

export { StampUpload, type StampUploadProps }
