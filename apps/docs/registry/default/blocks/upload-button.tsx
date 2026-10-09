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

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
  UploadSpinner,
  UploadTrigger,
} from "@/registry/default/ui/upload"

interface UploadButtonProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  multiple?: boolean
  children?: React.ReactNode
  /** Show the uploaded files under the button. Default `true`. */
  showQueue?: boolean
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** A single button that uploads and reports progress inline. */
function UploadButton<TResult = unknown>({
  adapter,
  uploader,
  children = "Upload file",
  showQueue = true,
  className,
  ...options
}: UploadButtonProps<TResult>) {
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
      <div className="flex items-center gap-3">
        <UploadTrigger variant="default" size="default">
          <IconPlaceholder
            lucide="UploadIcon"
            tabler="IconUpload"
            hugeicons="Upload01Icon"
            phosphor="UploadSimpleIcon"
            remixicon="RiUploadLine"
            data-icon="inline-start"
          />
          {children}
        </UploadTrigger>
        <UploadButtonStatus />
      </div>
      {showQueue ? (
        <UploadList>
          <UploadItem variant="muted" size="sm">
            <UploadItemMedia variant="icon" />
            <UploadItemContent>
              <UploadItemTitle />
              <UploadItemDescription />
            </UploadItemContent>
            <UploadItemActions />
            <UploadItemProgress />
          </UploadItem>
        </UploadList>
      ) : null}
    </Upload>
  )
}

function UploadButtonStatus() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  if (summary.isUploading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
        <UploadSpinner />
        {Math.round(summary.percent)}%
      </span>
    )
  }
  if (summary.isComplete) {
    return (
      <span className="inline-flex animate-in items-center gap-1.5 text-sm text-muted-foreground fade-in-0 motion-reduce:animate-none">
        <IconPlaceholder
          lucide="CircleCheckIcon"
          tabler="IconCircleCheckFilled"
          hugeicons="CheckmarkCircle01Icon"
          phosphor="CheckCircleIcon"
          remixicon="RiCheckboxCircleFill"
          className="size-4 text-foreground"
          aria-hidden
        />
        Done
      </span>
    )
  }
  return null
}

export { UploadButton, type UploadButtonProps }
