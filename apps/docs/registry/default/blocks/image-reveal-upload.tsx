"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  useFilePreview,
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
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadTrigger,
} from "@/registry/default/ui/upload"

interface ImageRevealUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Default 20 MB. */
  maxSize?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A single-image uploader where the photo develops as it uploads: blurred
 * and desaturated at first, revealed sharp behind a scan line that follows
 * the upload progress.
 */
function ImageRevealUpload<TResult = unknown>({
  adapter,
  uploader,
  maxSize = 20 * 1000 * 1000,
  onSuccess,
  className,
}: ImageRevealUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles: 1,
            maxSize,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      multiple={false}
      className={className}
    >
      <Stage />
    </Upload>
  )
}

function Stage() {
  const { uploader } = useUploadContext()
  const item = useUploadSelector(uploader, (state) =>
    [...state.items].reverse().find((entry) => entry.status !== "rejected")
  )
  const rejected = useUploadSelector(uploader, (state) =>
    [...state.items].reverse().find((entry) => entry.status === "rejected")
  )
  const url = useFilePreview(item?.originalFile ?? null, {
    thumbnailSize: 1200,
  })
  const reduceMotion = useReducedMotion()

  if (!item || !url) {
    return (
      <UploadDropzone className="aspect-video">
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="ImageUpIcon"
              tabler="IconPhotoUp"
              hugeicons="ImageUploadIcon"
              phosphor="ImageIcon"
              remixicon="RiImageAddLine"
            />
          </UploadDropzoneMedia>
          <UploadDropzoneTitle>Drop a photo</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            {rejected?.issues[0]?.message ?? "Watch it develop as it uploads"}
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
    )
  }

  const done = item.status === "success"
  const failed = item.status === "error"
  const percent = done ? 100 : item.progress.percent

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
        {/* Undeveloped */}
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img
          src={url}
          alt=""
          className="absolute inset-0 size-full scale-105 object-cover blur-md grayscale"
        />
        {/* Developed, clipped to the progress */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ clipPath: `inset(${100 - percent}% 0 0 0)` }}
          transition={
            reduceMotion ? { duration: 0 } : { ease: "easeOut", duration: 0.35 }
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={url} alt={item.name} className="size-full object-cover" />
        </motion.div>
        {/* Scan line */}
        {!done && !failed && !reduceMotion ? (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 h-px bg-background shadow-lg shadow-background"
            initial={false}
            animate={{ top: `${100 - percent}%` }}
            transition={{ ease: "easeOut", duration: 0.35 }}
          />
        ) : null}
        <AnimatePresence>
          {done ? (
            <motion.span
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm"
            >
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
                className="size-3"
                strokeWidth={3}
                aria-hidden
              />
              Uploaded
            </motion.span>
          ) : null}
        </AnimatePresence>
        {done && !reduceMotion ? (
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-background"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{item.name}</span>
          <span
            className={cn(
              "text-xs text-muted-foreground tabular-nums",
              failed && "text-destructive"
            )}
          >
            {failed
              ? (item.error?.message ?? "Upload failed")
              : done
                ? "Developed"
                : `Developing… ${Math.round(percent)}%`}
          </span>
        </div>
        <UploadTrigger>
          <IconPlaceholder
            lucide="RefreshCwIcon"
            tabler="IconRefresh"
            hugeicons="RepeatIcon"
            phosphor="ArrowsClockwiseIcon"
            remixicon="RiRefreshLine"
            data-icon="inline-start"
          />
          Replace
        </UploadTrigger>
      </div>
    </div>
  )
}

export { ImageRevealUpload, type ImageRevealUploadProps }
