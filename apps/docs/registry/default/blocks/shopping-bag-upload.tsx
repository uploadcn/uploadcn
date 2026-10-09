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
  UploadItemMedia,
} from "@/registry/default/ui/upload"

interface ShoppingBagUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Default 12. */
  maxFiles?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * For storefronts and marketplaces: product photos drop into a shopping
 * bag, the counter bounces, and the bag fills as they upload.
 */
function ShoppingBagUpload<TResult = unknown>({
  adapter,
  uploader,
  maxFiles = 12,
  onSuccess,
  className,
}: ShoppingBagUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      className={cn("items-center", className)}
    >
      <UploadDropzone
        variant="muted"
        className="w-full max-w-sm gap-4 bg-transparent hover:bg-transparent data-dragging:bg-transparent data-dragging:ring-0"
      >
        <Bag />
      </UploadDropzone>
    </Upload>
  )
}

function Bag() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const products = useUploadSelector(uploader, (state) =>
    state.items.filter(
      (item) => item.status !== "rejected" && item.status !== "cancelled"
    )
  )
  const reduceMotion = useReducedMotion()
  const fill =
    summary.total === 0 ? 0 : summary.isComplete ? 100 : summary.percent

  return (
    <>
      <div className="relative h-44 w-40" aria-hidden>
        {/* Handles */}
        <div className="absolute top-0 left-1/2 h-12 w-16 -translate-x-1/2 rounded-t-full border-4 border-b-0 border-foreground/80 transition-transform duration-300 group-data-dragging/upload-dropzone:-translate-y-2" />
        {/* Falling products */}
        <AnimatePresence initial={false}>
          {products.slice(-3).map((item, index) => (
            <UploadItemContext.Provider key={item.id} value={item}>
              <motion.div
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { y: -120, opacity: 0, rotate: -15, scale: 1.1 }
                }
                animate={{
                  y: 0,
                  opacity: 1,
                  rotate: (index - 1) * 8,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0.35, duration: 0.7 }}
                className="absolute top-12 left-1/2 z-0 size-14 -translate-x-1/2 overflow-hidden rounded-lg border bg-muted shadow-sm"
                style={{ marginLeft: (index - 1) * 26 }}
              >
                <UploadItemMedia variant="cover" />
              </motion.div>
            </UploadItemContext.Provider>
          ))}
        </AnimatePresence>
        {/* Bag body */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-32 overflow-hidden rounded-t-md rounded-b-2xl bg-foreground/90 shadow-lg transition-transform duration-300 group-data-dragging/upload-dropzone:scale-105">
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-primary/40"
            initial={false}
            animate={{ height: `${fill}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
          />
          <div className="relative flex size-full flex-col items-center justify-center gap-1 text-background">
            <IconPlaceholder
              lucide="ShoppingBagIcon"
              tabler="IconShoppingBag"
              hugeicons="ShoppingBag01Icon"
              phosphor="BagIcon"
              remixicon="RiShoppingBagLine"
              className="size-6"
            />
            <span className="text-xs font-medium tabular-nums">
              {summary.isUploading
                ? `${Math.round(summary.percent)}%`
                : "Drop photos"}
            </span>
          </div>
        </div>
        {/* Count */}
        <AnimatePresence>
          {products.length > 0 ? (
            <motion.span
              key={products.length}
              initial={reduceMotion ? false : { scale: 1.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.5 }}
              className="absolute right-1 bottom-24 z-20 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums shadow-md ring-2 ring-background"
            >
              {products.length}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {products.length === 0
          ? "Drag product photos into the bag, or click"
          : summary.isComplete
            ? `${products.length} product photo${products.length === 1 ? "" : "s"} ready`
            : `Adding ${products.length} photo${products.length === 1 ? "" : "s"}…`}
      </p>
    </>
  )
}

export { ShoppingBagUpload, type ShoppingBagUploadProps }
