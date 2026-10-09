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

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  NativeButton,
  Upload,
  UploadClear,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
} from "@/registry/default/ui/upload"

interface UploadPopoverProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** The trigger's label. Default `"Attachments"`. */
  label?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * Attachments behind a button, for toolbars, comment boxes and tickets.
 * The trigger shows a count and a progress ring while files upload.
 */
function UploadPopover<TResult = unknown>({
  adapter,
  uploader,
  label = "Attachments",
  className,
  ...options
}: UploadPopoverProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={cn("w-auto items-start", className)}
    >
      <AttachmentsPopover label={label}>
        <div className="flex flex-col gap-1">
          <h3 className="cn-upload-card-title">{label}</h3>
          <p className="cn-upload-card-description text-muted-foreground">
            Files are shared with everyone here.
          </p>
        </div>
        <UploadDropzone size="sm" className="py-5">
          <UploadDropzoneTitle className="text-xs">
            Drop files or click to attach
          </UploadDropzoneTitle>
          <UploadDropzoneDescription className="text-xs">
            Up to 10 MB each
          </UploadDropzoneDescription>
        </UploadDropzone>
        <UploadList className="max-h-56 gap-1 overflow-y-auto">
          <UploadItem size="xs" variant="default" className="hover:bg-muted/60">
            <UploadItemMedia className="size-7" />
            <UploadItemContent>
              <UploadItemTitle />
              <UploadItemDescription />
            </UploadItemContent>
            <UploadItemActions />
            <UploadItemProgress />
          </UploadItem>
        </UploadList>
        <div className="flex justify-end">
          <UploadClear size="xs">Clear finished</UploadClear>
        </div>
      </AttachmentsPopover>
    </Upload>
  )
}

/**
 * A popover on the native Popover API: light dismiss, Escape and the top
 * layer come from the browser, so it works the same on every shadcn base.
 */
function AttachmentsPopover({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const id = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const radius = 6
  const circumference = 2 * Math.PI * radius

  // Place the panel under the trigger, flipping up near the bottom edge.
  const place = React.useCallback(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const rect = trigger.getBoundingClientRect()
    const width = panel.offsetWidth || 320
    const height = panel.offsetHeight || 320
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
    const below = rect.bottom + 6
    const top =
      below + height > window.innerHeight - 8 && rect.top - height - 6 > 8
        ? rect.top - height - 6
        : below
    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
  }, [])

  React.useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState !== "open") return
      place()
      window.addEventListener("resize", place)
      window.addEventListener("scroll", place, true)
    }
    const onClose = (event: Event) => {
      if ((event as ToggleEvent).newState === "open") return
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
    panel.addEventListener("toggle", onToggle)
    panel.addEventListener("toggle", onClose)
    return () => {
      panel.removeEventListener("toggle", onToggle)
      panel.removeEventListener("toggle", onClose)
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [place])

  return (
    <>
      <NativeButton
        ref={triggerRef}
        variant="outline"
        size="sm"
        popoverTarget={id}
        onClick={place}
        aria-label={summary.total ? `${label}, ${summary.total} files` : label}
      >
        {summary.isUploading ? (
          <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden>
            <circle
              cx="8"
              cy="8"
              r={radius}
              fill="none"
              strokeWidth="2"
              className="stroke-muted"
            />
            <circle
              cx="8"
              cy="8"
              r={radius}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - summary.percent / 100)}
              className="stroke-primary transition-[stroke-dashoffset] duration-300"
            />
          </svg>
        ) : (
          <IconPlaceholder
            lucide="PaperclipIcon"
            tabler="IconPaperclip"
            hugeicons="AttachmentIcon"
            phosphor="PaperclipIcon"
            remixicon="RiAttachmentLine"
            data-icon="inline-start"
          />
        )}
        {label}
        {summary.total > 0 ? (
          <span className="ms-0.5 rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
            {summary.total}
          </span>
        ) : null}
      </NativeButton>
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        data-slot="upload-popover-content"
        className="cn-upload-popover fixed inset-auto m-0 hidden w-80 flex-col gap-3 bg-popover text-popover-foreground open:flex open:animate-in open:fade-in-0 open:zoom-in-95 motion-reduce:open:animate-none"
      >
        {children}
      </div>
    </>
  )
}

export { UploadPopover, type UploadPopoverProps }
