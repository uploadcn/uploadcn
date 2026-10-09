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
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import { motion, useReducedMotion } from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadItemMedia,
  UploadItemProgress,
} from "@/registry/default/ui/upload"

interface FlipCardUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  title?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A single-file card that flips over when the upload finishes, showing
 * the file on its back. Flip it again to upload another.
 */
function FlipCardUpload<TResult = unknown>({
  adapter,
  uploader,
  title = "Upload your file",
  className,
  ...options
}: FlipCardUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, maxFiles: 1, ...options }) as UploadRootProps<TResult>)}
      multiple={false}
      className={cn("items-center", className)}
    >
      <Card title={title} />
    </Upload>
  )
}

function Card({ title }: { title: string }) {
  const { uploader } = useUploadContext()
  const item = useUploadSelector(uploader, (state) =>
    state.items.find((entry) => entry.status !== "cancelled")
  )
  const reduceMotion = useReducedMotion()
  const flipped = item?.status === "success"

  return (
    <div className="h-56 w-full max-w-xs [perspective:1000px]">
      <motion.div
        className="relative size-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", bounce: 0.25, duration: 0.8 }
        }
      >
        {/* Front */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
          inert={flipped}
        >
          {item && !flipped && item.status !== "rejected" ? (
            <UploadItemContext.Provider value={item}>
              <div className="cn-upload-card flex size-full flex-col items-center justify-center gap-3 text-center">
                <UploadItemMedia />
                <span className="max-w-full truncate text-sm font-medium">
                  {item.name}
                </span>
                <UploadItemProgress forceMount className="w-40" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.status === "error"
                    ? item.error?.message
                    : `${Math.round(item.progress.percent)}%`}
                </span>
              </div>
            </UploadItemContext.Provider>
          ) : (
            <UploadDropzone
              className="size-full rounded-2xl shadow-sm"
              variant="outline"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-muted transition-transform group-data-dragging/upload-dropzone:scale-110">
                <IconPlaceholder
                  lucide="FileUpIcon"
                  tabler="IconFileUpload"
                  hugeicons="FileUploadIcon"
                  phosphor="FileArrowUpIcon"
                  remixicon="RiFileUploadLine"
                  className="size-5"
                />
              </span>
              <UploadDropzoneTitle>{title}</UploadDropzoneTitle>
              <UploadDropzoneDescription>
                {item?.status === "rejected"
                  ? item.issues[0]?.message
                  : "Drop it here or click to browse"}
              </UploadDropzoneDescription>
            </UploadDropzone>
          )}
        </div>
        {/* Back */}
        <div
          className="cn-upload-card absolute inset-0 flex flex-col overflow-hidden p-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          inert={!flipped}
        >
          {item && flipped ? (
            <UploadItemContext.Provider value={item}>
              <div className="relative h-28 shrink-0 bg-muted">
                <UploadItemMedia variant="cover" className="[&_svg]:size-8" />
                <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <IconPlaceholder
                    lucide="CheckIcon"
                    tabler="IconCheck"
                    hugeicons="Tick02Icon"
                    phosphor="CheckIcon"
                    remixicon="RiCheckLine"
                    className="size-4"
                    strokeWidth={3}
                  />
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2 p-4">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(item.size)} · uploaded
                  </span>
                </div>
                <NativeButton
                  variant="outline"
                  size="sm"
                  onClick={() => uploader.remove(item.id)}
                >
                  <IconPlaceholder
                    lucide="RotateCcwIcon"
                    tabler="IconRotate"
                    hugeicons="ArrowTurnBackwardIcon"
                    phosphor="ArrowCounterClockwiseIcon"
                    remixicon="RiArrowGoBackLine"
                    data-icon="inline-start"
                  />
                  Upload another
                </NativeButton>
              </div>
            </UploadItemContext.Provider>
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}

export { FlipCardUpload, type FlipCardUploadProps }
