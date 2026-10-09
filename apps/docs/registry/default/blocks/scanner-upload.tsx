"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadItemMedia,
  UploadTrigger,
} from "@/registry/default/ui/upload"

interface ScannerUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  label?: string
  /** Default images and PDF. */
  accept?: string
  /** Default 15 MB. */
  maxSize?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A document scanner frame for IDs, receipts and contracts: corner guides
 * lock on, a scan beam sweeps while it uploads, then the frame confirms.
 * Opens the rear camera on phones.
 */
function ScannerUpload<TResult = unknown>({
  adapter,
  uploader,
  label = "Scan a document",
  accept = "image/*,application/pdf",
  maxSize = 15 * 1000 * 1000,
  onSuccess,
  className,
}: ScannerUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept,
            maxFiles: 1,
            maxSize,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      multiple={false}
      capture="environment"
      className={cn("items-center", className)}
    >
      <Scanner label={label} />
    </Upload>
  )
}

const CORNERS = [
  "top-0 left-0 border-t-4 border-l-4 rounded-tl-xl",
  "top-0 right-0 border-t-4 border-r-4 rounded-tr-xl",
  "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl",
  "bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl",
]

function Scanner({ label }: { label: string }) {
  const { uploader } = useUploadContext()
  const item = useUploadSelector(uploader, (state) =>
    state.items.find((entry) => entry.status !== "cancelled")
  )
  const reduceMotion = useReducedMotion()
  const scanning =
    !!item &&
    (item.status === "uploading" ||
      item.status === "queued" ||
      item.status === "processing" ||
      item.status === "scanning")
  const done = item?.status === "success"
  const failed = item?.status === "error" || item?.status === "rejected"

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <UploadDropzone
        variant="muted"
        className="relative aspect-[1.586] w-full overflow-hidden rounded-2xl p-0"
        aria-label={label}
      >
        {/* Corner guides */}
        {CORNERS.map((corner, index) => (
          <motion.span
            key={index}
            aria-hidden
            className={cn(
              "absolute z-10 size-7 border-muted-foreground/50 transition-colors",
              corner,
              scanning && "border-primary",
              done && "border-primary",
              failed && "border-destructive"
            )}
            animate={
              reduceMotion ? undefined : { scale: scanning || done ? 0.92 : 1 }
            }
            transition={{ type: "spring", bounce: 0.4 }}
          />
        ))}
        {item && item.status !== "rejected" ? (
          <UploadItemContext.Provider value={item}>
            <UploadItemMedia
              variant="cover"
              className={cn(
                "transition-[filter] duration-500",
                scanning && "grayscale"
              )}
            />
          </UploadItemContext.Provider>
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <IconPlaceholder
              lucide="ScanLineIcon"
              tabler="IconScan"
              hugeicons="DocumentValidationIcon"
              phosphor="ScanIcon"
              remixicon="RiScan2Line"
              className="size-7"
            />
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs">Fit it inside the corners</span>
          </span>
        )}
        {/* Beam */}
        {scanning && !reduceMotion ? (
          <motion.span
            aria-hidden
            className="absolute inset-x-3 z-10 h-0.5 rounded-full bg-primary shadow-lg shadow-primary"
            initial={{ top: "8%" }}
            animate={{ top: ["8%", "92%", "8%"] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />
        ) : null}
        <AnimatePresence>
          {done ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute z-10 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            >
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
                className="size-6"
                strokeWidth={3}
              />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </UploadDropzone>
      <div className="flex w-full items-center justify-between gap-2 text-sm">
        <span
          aria-live="polite"
          className={cn("text-muted-foreground", failed && "text-destructive")}
        >
          {scanning
            ? `Scanning… ${Math.round(item?.progress.percent ?? 0)}%`
            : done
              ? "Document captured"
              : failed
                ? (item?.issues[0]?.message ??
                  item?.error?.message ??
                  "Try again")
                : "Photo or PDF"}
        </span>
        {item ? (
          <UploadTrigger variant="ghost" size="sm">
            Rescan
          </UploadTrigger>
        ) : null}
      </div>
    </div>
  )
}

export { ScannerUpload, type ScannerUploadProps }
