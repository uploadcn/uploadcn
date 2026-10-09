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

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

interface CloudDropzoneProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  showQueue?: boolean
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

const CLOUD =
  "M38 58h46a20 20 0 0 0 1.6-39.94A28 28 0 0 0 31.3 22.1 18 18 0 0 0 38 58Z"

/**
 * Upload to the cloud, literally: particles rise into the cloud while
 * files upload, and the cloud fills with the progress.
 */
function CloudDropzone<TResult = unknown>({
  adapter,
  uploader,
  showQueue = true,
  className,
  ...options
}: CloudDropzoneProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, ...options }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadDropzone variant="outline" size="lg" className="overflow-hidden">
        <Cloud />
      </UploadDropzone>
      {showQueue ? <UploadQueue size="sm" variant="muted" /> : null}
    </Upload>
  )
}

function Cloud() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const fill = summary.isComplete ? 100 : summary.percent
  const active = summary.isUploading && !reduceMotion
  const clipId = React.useId()

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-28 w-36" aria-hidden>
        <svg
          viewBox="0 0 120 70"
          className="absolute inset-x-0 top-0 h-20 w-full overflow-visible"
        >
          <defs>
            <clipPath id={clipId}>
              <path d={CLOUD} />
            </clipPath>
          </defs>
          <path
            d={CLOUD}
            className="fill-muted stroke-border"
            strokeWidth="1.5"
          />
          <g clipPath={`url(#${clipId})`}>
            <motion.rect
              x="0"
              width="120"
              height="70"
              className="fill-primary/25"
              initial={false}
              animate={{ y: 70 - (fill / 100) * 52 - 6 }}
              transition={{ type: "spring", bounce: 0, duration: 0.8 }}
            />
          </g>
          <motion.path
            d="M48 40l12-12 12 12M60 29v22"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-foreground"
            animate={active ? { y: [0, -3, 0] } : { y: 0 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        </svg>
        {/* Rising particles */}
        {active
          ? Array.from({ length: 7 }, (_, index) => (
              <motion.span
                key={index}
                className={cn(
                  "absolute bottom-0 size-1.5 rounded-full bg-primary",
                  index % 2 ? "opacity-60" : "opacity-90"
                )}
                style={{ left: `${22 + index * 9}%` }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -62, opacity: [0, 1, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.1 + (index % 3) * 0.25,
                  delay: index * 0.17,
                  ease: "easeOut",
                }}
              />
            ))
          : null}
      </div>
      <UploadDropzoneTitle>
        {summary.isUploading
          ? `Uploading to the cloud… ${Math.round(summary.percent)}%`
          : summary.isComplete
            ? "Safely in the cloud"
            : "Drop files to upload"}
      </UploadDropzoneTitle>
      <UploadDropzoneDescription>
        <span className="group-data-dragging/upload-dropzone:hidden">
          or click to browse
        </span>
        <span className="hidden group-data-dragging/upload-dropzone:inline">
          Release to upload
        </span>
      </UploadDropzoneDescription>
    </div>
  )
}

export { CloudDropzone, type CloudDropzoneProps }
