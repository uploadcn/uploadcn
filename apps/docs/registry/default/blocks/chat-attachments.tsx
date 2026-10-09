"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type UploadItem as UploadItemData,
  getUploadSummary,
} from "@uploadcn/core"
import { compressImage } from "@uploadcn/core/image"
import {
  Upload as UploadPrimitive,
  useDropzone,
  usePasteFiles,
  useUploadSelector,
  useUploader,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  NativeButton,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemRemove,
  UploadItemRetry,
  UploadItemTitle,
  UploadList,
  UploadTrigger,
} from "@/registry/default/ui/upload"

/** What most multimodal LLM APIs accept as attachments. */
const AI_ACCEPT = [
  "image/*",
  "application/pdf",
  "text/*",
  ".md",
  ".csv",
  ".json",
  ".docx",
]

export interface ChatMessage<TResult> {
  text: string
  attachments: UploadItemData<TResult>[]
}

interface ChatAttachmentsProps<TResult> {
  adapter?: UploadAdapter<TResult>
  onSend: (message: ChatMessage<TResult>) => void | Promise<void>
  placeholder?: string
  maxFiles?: number
  maxSize?: number
  accept?: string[]
  disabled?: boolean
  className?: string
}

/** Images are downscaled for vision models: smaller uploads, same answers. */
const prepareForModel = (file: File) =>
  compressImage(file, { maxWidth: 1568, maxHeight: 1568, type: "image/webp" })

/**
 * A ChatGPT-style composer: attach by clicking, dragging onto the input or
 * pasting screenshots. Files upload while the user types; sending waits for
 * them to finish.
 */
function ChatAttachments<TResult = unknown>({
  adapter,
  onSend,
  placeholder = "Ask anything, or attach files…",
  maxFiles = 10,
  maxSize = 25 * 1000 * 1000,
  accept = AI_ACCEPT,
  disabled = false,
  className,
}: ChatAttachmentsProps<TResult>) {
  const [text, setText] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const inputId = React.useId()
  const uploader = useUploader<TResult>({
    adapter,
    accept,
    maxFiles,
    maxSize,
    transform: prepareForModel,
  })
  const summary = useUploadSelector(
    uploader,
    (state) => getUploadSummary(state.items),
    (a, b) =>
      a.total === b.total &&
      a.isUploading === b.isUploading &&
      a.counts.success === b.counts.success
  )

  const addFiles = React.useCallback(
    (files: File[]) => void uploader.add(files),
    [uploader]
  )
  const { isDragging, handlers } = useDropzone({
    onDrop: addFiles,
    accept,
    disabled,
  })
  usePasteFiles({ onPaste: addFiles, target: formRef, enabled: !disabled })

  const canSend =
    !disabled &&
    !isSending &&
    !summary.isUploading &&
    (text.trim().length > 0 || summary.counts.success > 0)

  async function send(event?: React.FormEvent) {
    event?.preventDefault()
    if (!canSend) return
    const attachments = uploader
      .getState()
      .items.filter((item) => item.status === "success")
    setIsSending(true)
    try {
      await onSend({ text: text.trim(), attachments })
      setText("")
      uploader.remove()
    } finally {
      setIsSending(false)
    }
  }

  return (
    <UploadPrimitive.Root
      uploader={uploader}
      disabled={disabled}
      render={<div className={cn("w-full", className)} />}
    >
      <form
        ref={formRef}
        onSubmit={send}
        {...handlers}
        data-dragging={isDragging || undefined}
        className="relative flex flex-col gap-2 rounded-2xl border bg-background p-2 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 data-dragging:border-primary"
      >
        {isDragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex animate-in items-center justify-center rounded-2xl bg-background/90 text-sm font-medium fade-in-0 motion-reduce:animate-none">
            Drop to attach
          </div>
        ) : null}
        <UploadList
          variant="inline"
          className="px-1 pt-1"
          aria-label="Attachments"
        >
          <UploadItem variant="muted" size="xs" className="w-56 rounded-xl">
            <UploadItemMedia />
            <UploadItemContent>
              <UploadItemTitle />
              <UploadItemDescription className="line-clamp-1" />
            </UploadItemContent>
            <UploadItemActions>
              <UploadItemRetry />
              <UploadItemRemove />
            </UploadItemActions>
            <UploadItemProgress />
          </UploadItem>
        </UploadList>
        <label htmlFor={inputId} className="sr-only">
          Message
        </label>
        <textarea
          id={inputId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              void send()
            }
          }}
          rows={2}
          placeholder={placeholder}
          disabled={disabled}
          className="field-sizing-content max-h-48 min-h-12 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2">
          <UploadTrigger
            variant="ghost"
            size="icon-sm"
            aria-label="Attach files"
          >
            <IconPlaceholder
              lucide="PaperclipIcon"
              tabler="IconPaperclip"
              hugeicons="AttachmentIcon"
              phosphor="PaperclipIcon"
              remixicon="RiAttachmentLine"
            />
          </UploadTrigger>
          <div className="flex items-center gap-2">
            {summary.isUploading ? (
              <span className="text-xs text-muted-foreground">
                Uploading attachments…
              </span>
            ) : null}
            <NativeButton
              type="submit"
              size="icon-sm"
              disabled={!canSend}
              aria-label="Send message"
            >
              <IconPlaceholder
                lucide="ArrowUpIcon"
                tabler="IconArrowUp"
                hugeicons="ArrowUpIcon"
                phosphor="ArrowUpIcon"
                remixicon="RiArrowUpLine"
              />
            </NativeButton>
          </div>
        </div>
      </form>
    </UploadPrimitive.Root>
  )
}

export { ChatAttachments, type ChatAttachmentsProps }
