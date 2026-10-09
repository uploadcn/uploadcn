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
  type UploadRootProps,
} from "@uploadcn/react"

import {
  Upload,
  UploadClear,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
  UploadProgress,
  UploadStart,
} from "@/registry/default/ui/upload"

interface FileUploadProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles" | "image" | "media"
> {
  /** Where files go. Defaults to the `/api/upload` route (S3/R2). */
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** When `false`, files wait for the Upload button. Default `true`. */
  autoUpload?: boolean
  multiple?: boolean
  disabled?: boolean
  title?: React.ReactNode
  description?: React.ReactNode
  onSuccess?: (item: UploadItemData<TResult>) => void
  onComplete?: (items: UploadItemData<TResult>[]) => void
  className?: string
}

function describeLimits({
  accept,
  maxSize,
  maxFiles,
}: Pick<ValidationOptions, "accept" | "maxSize" | "maxFiles">) {
  const parts: string[] = []
  if (accept) {
    const tokens = typeof accept === "string" ? accept.split(",") : accept
    parts.push(
      tokens
        .map((token) => token.trim())
        .map((token) =>
          token.endsWith("/*")
            ? `${token.slice(0, -2)}s`
            : token.startsWith(".")
              ? token.slice(1).toUpperCase()
              : (token.split("/")[1]?.toUpperCase() ?? token)
        )
        .join(", ")
    )
  }
  if (maxSize) parts.push(`up to ${formatBytes(maxSize)}`)
  if (maxFiles) parts.push(`max ${maxFiles} file${maxFiles === 1 ? "" : "s"}`)
  return parts.join(" · ")
}

/** A dropzone, a queue with per-file progress and a summary footer. */
function FileUpload<TResult = unknown>({
  adapter,
  uploader,
  title = "Drop files here or click to browse",
  description,
  className,
  ...options
}: FileUploadProps<TResult>) {
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
      <UploadDropzone>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon" />
          <UploadDropzoneTitle>{title}</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            {description ?? (describeLimits(options) || "Any file type")}
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <UploadList>
        <UploadItem>
          <UploadItemMedia />
          <UploadItemContent>
            <UploadItemTitle />
            <UploadItemDescription />
          </UploadItemContent>
          <UploadItemActions />
          <UploadItemProgress />
        </UploadItem>
      </UploadList>
      <FileUploadSummary />
    </Upload>
  )
}

function FileUploadSummary() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  if (summary.total < 2 && summary.counts.idle === 0) return null
  return (
    <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground tabular-nums">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex justify-between gap-2">
          <span>
            {summary.counts.success} of {summary.total} uploaded
          </span>
          <span>
            {formatBytes(summary.loaded)} / {formatBytes(summary.size)}
          </span>
        </div>
        <UploadProgress />
      </div>
      <UploadClear>Clear</UploadClear>
      <UploadStart>Upload</UploadStart>
    </div>
  )
}

export { FileUpload, type FileUploadProps }
