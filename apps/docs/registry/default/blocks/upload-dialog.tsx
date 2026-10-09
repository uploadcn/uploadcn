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
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  NativeButton,
  UploadModal,
  UploadModalDescription,
  UploadModalFooter,
  UploadModalHeader,
  UploadModalTitle,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadQueue,
  UploadSummary,
} from "@/registry/default/ui/upload"

interface UploadDialogProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  title?: string
  description?: string
  /** The trigger button's label. Default `"Upload files"`. */
  label?: React.ReactNode
  /** Called with the uploaded items when the user clicks Done. */
  onDone?: (items: UploadItemData<TResult>[]) => void
  className?: string
}

/**
 * The classic "Upload files" modal: pick files, review the list, then
 * upload. Closing mid-upload only hides the dialog, uploads continue.
 */
function UploadDialog<TResult = unknown>({
  adapter,
  uploader,
  title = "Upload files",
  description = "Add files, review them, then upload.",
  label = "Upload files",
  onDone,
  className,
  ...options
}: UploadDialogProps<TResult>) {
  const [open, setOpen] = React.useState(false)
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            autoUpload: false,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={cn("w-auto items-start", className)}
    >
      <NativeButton
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <IconPlaceholder
          lucide="UploadIcon"
          tabler="IconUpload"
          hugeicons="Upload01Icon"
          phosphor="UploadSimpleIcon"
          remixicon="RiUploadLine"
          data-icon="inline-start"
        />
        {label}
      </NativeButton>
      <UploadModal open={open} onOpenChange={setOpen} className="sm:max-w-lg">
        <UploadModalHeader>
          <UploadModalTitle>{title}</UploadModalTitle>
          <UploadModalDescription>{description}</UploadModalDescription>
        </UploadModalHeader>
        <DialogBody />
        <DialogActions
          onClose={() => setOpen(false)}
          onDone={onDone as (items: UploadItemData[]) => void}
        />
      </UploadModal>
    </Upload>
  )
}

function DialogBody() {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <UploadDropzone size="sm" className="py-8">
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="UploadIcon"
              tabler="IconUpload"
              hugeicons="Upload01Icon"
              phosphor="UploadSimpleIcon"
              remixicon="RiUploadLine"
            />
          </UploadDropzoneMedia>
          <UploadDropzoneTitle>
            Drop files or click to browse
          </UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Nothing uploads until you confirm
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <UploadQueue
        size="sm"
        variant="muted"
        className="max-h-64 overflow-y-auto"
      />
    </div>
  )
}

function DialogActions({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone?: (items: UploadItemData[]) => void
}) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const idle = useUploadSelector(
    uploader,
    (state) => state.items.filter((item) => item.status === "idle").length
  )
  const finished = summary.total > 0 && idle === 0 && !summary.isUploading

  const done = () => {
    onDone?.(
      uploader.getState().items.filter((item) => item.status === "success")
    )
    uploader.clearCompleted()
    onClose()
  }

  return (
    <UploadModalFooter className="items-center sm:justify-between">
      <UploadSummary className="max-sm:order-last" />
      <div className="flex gap-2 sm:ms-auto">
        {finished ? (
          <NativeButton onClick={done}>Done</NativeButton>
        ) : (
          <>
            <NativeButton variant="outline" onClick={onClose}>
              {summary.isUploading ? "Hide" : "Cancel"}
            </NativeButton>
            <NativeButton
              disabled={idle === 0 || summary.isUploading}
              onClick={() => uploader.start()}
            >
              {summary.isUploading
                ? `Uploading… ${Math.round(summary.percent)}%`
                : idle > 0
                  ? `Upload ${idle} file${idle === 1 ? "" : "s"}`
                  : "Upload"}
            </NativeButton>
          </>
        )}
      </div>
    </UploadModalFooter>
  )
}

export { UploadDialog, type UploadDialogProps }
