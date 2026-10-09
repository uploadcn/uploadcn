"use client"

import * as React from "react"
import {
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

interface DeliveryUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Where the files are going, shown at the end of the road. */
  destination?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * For shipping manifests, invoices and proof of delivery: a truck carries
 * the files from the warehouse to their destination as they upload, and
 * drops the parcel off when it arrives.
 */
function DeliveryUpload<TResult = unknown>({
  adapter,
  uploader,
  destination = "Head office",
  className,
  ...options
}: DeliveryUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={cn("w-full max-w-xl", className)}
    >
      <UploadDropzone
        variant="outline"
        className="overflow-hidden rounded-2xl p-0"
      >
        <Road destination={destination} />
      </UploadDropzone>
    </Upload>
  )
}

function Road({ destination }: { destination: string }) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const percent = summary.isComplete ? 100 : summary.percent
  const driving = summary.isUploading && !reduceMotion
  const arrived = summary.isComplete
  const failed = summary.hasErrors && !summary.isUploading && !arrived

  const distance = useSpring(percent, { stiffness: 40, damping: 18 })
  React.useEffect(() => {
    if (reduceMotion) distance.jump(percent)
    else distance.set(percent)
  }, [distance, percent, reduceMotion])
  // Keep the truck between the warehouse and the pin.
  const left = useTransform(distance, (value) => `calc(${8 + value * 0.62}%)`)

  const eta = formatDuration(summary.eta)

  return (
    <div className="flex w-full flex-col">
      <div className="relative h-40 w-full bg-muted/30">
        {/* Warehouse */}
        <svg
          viewBox="0 0 48 40"
          className="absolute bottom-10 left-3 w-12"
          aria-hidden
        >
          <path
            d="M2 16 L24 4 L46 16 V40 H2 Z"
            className="fill-muted-foreground/30"
          />
          <rect
            x="14"
            y="22"
            width="20"
            height="18"
            className="fill-muted-foreground/50"
          />
          <path
            d="M14 27 H34 M14 32 H34"
            strokeWidth="1.5"
            className="stroke-muted/80"
          />
        </svg>
        {/* Destination */}
        <div className="absolute right-3 bottom-10 flex flex-col items-center gap-1">
          <motion.svg
            viewBox="0 0 24 32"
            className={cn(
              "w-7",
              arrived ? "text-primary" : "text-muted-foreground/60"
            )}
            aria-hidden
            animate={arrived && !reduceMotion ? { y: [0, -6, 0] } : { y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <path
              d="M12 31 C5 20 2 15 2 10 a10 10 0 0 1 20 0 c0 5 -3 10 -10 21Z"
              className="fill-current"
            />
            <circle cx="12" cy="10" r="4" className="fill-background" />
          </motion.svg>
        </div>

        {/* Road */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-10 overflow-hidden bg-foreground/85 dark:bg-muted"
        >
          <motion.div
            className="absolute top-1/2 flex w-[200%] -translate-y-1/2 gap-6"
            animate={driving ? { x: ["0%", "-50%"] } : undefined}
            transition={
              driving
                ? { duration: 1.2, ease: "linear", repeat: Infinity }
                : undefined
            }
          >
            {Array.from({ length: 40 }, (_, index) => (
              <span
                key={index}
                className="h-1 w-6 shrink-0 rounded-full bg-background/70"
              />
            ))}
          </motion.div>
        </div>

        {/* Truck */}
        <motion.div
          aria-hidden
          className="absolute bottom-7 w-24 -translate-x-1/2"
          style={{ left }}
        >
          <motion.svg
            viewBox="0 0 96 52"
            className="w-24 overflow-visible"
            animate={driving ? { y: [0, -1.5, 0] } : { y: 0 }}
            transition={{ duration: 0.3, repeat: driving ? Infinity : 0 }}
          >
            <rect
              x="2"
              y="4"
              width="58"
              height="34"
              rx="4"
              className={failed ? "fill-destructive" : "fill-primary"}
            />
            <path d="M60 14 H78 L92 28 V38 H60 Z" className="fill-foreground" />
            <path d="M66 18 H77 L86 27 H66 Z" className="fill-background/80" />
            <text
              x="31"
              y="26"
              textAnchor="middle"
              className="fill-primary-foreground font-mono text-xs font-semibold"
            >
              {summary.total
                ? `${summary.total} ${summary.total === 1 ? "file" : "files"}`
                : ""}
            </text>
            {[20, 74].map((cx) => (
              <motion.g
                key={cx}
                animate={driving ? { rotate: 360 } : undefined}
                transition={
                  driving
                    ? { duration: 0.6, ease: "linear", repeat: Infinity }
                    : undefined
                }
              >
                <circle cx={cx} cy="42" r="9" className="fill-foreground" />
                <circle cx={cx} cy="42" r="4" className="fill-muted" />
                <path
                  d={`M${cx} 38 V46`}
                  strokeWidth="1.5"
                  className="stroke-foreground"
                />
              </motion.g>
            ))}
          </motion.svg>
        </motion.div>

        {/* Parcel dropped at the destination */}
        <AnimatePresence>
          {arrived ? (
            <motion.span
              aria-hidden
              className="absolute right-12 bottom-10 size-6 rounded-sm border-2 border-primary bg-primary/20"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { y: -36, opacity: 0, rotate: -20 }
              }
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 14,
                delay: reduceMotion ? 0 : 0.5,
              }}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t px-4 py-3 text-left text-sm"
        aria-live="polite"
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">
            {summary.total === 0
              ? "Drop documents to ship them"
              : arrived
                ? `Delivered to ${destination}`
                : failed
                  ? "Delivery failed. Some files need a retry."
                  : `On the way to ${destination}`}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {summary.total === 0
              ? "Manifests, invoices, proof of delivery. Or click to choose."
              : `${summary.counts.success} of ${summary.total} delivered${
                  summary.isUploading && eta ? ` · arriving in ${eta}` : ""
                }`}
          </span>
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {summary.total ? `${Math.round(percent)}%` : ""}
        </span>
      </div>
    </div>
  )
}

export { DeliveryUpload, type DeliveryUploadProps }
