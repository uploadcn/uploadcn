"use client"

import * as React from "react"
import {
  ocrProcess,
  type OcrRecognizer,
  type OcrResult,
  type ProcessContext,
  type UploadAdapter,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadItemMedia,
  UploadItemProgress,
} from "@/registry/default/ui/upload"

interface OcrUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /**
   * Reads the text. `ocrEndpoint("/api/ocr")` for a server provider (Google
   * Vision, Textract, Azure, Mistral or your own), or `tesseractOcr(...)`
   * to read in the browser.
   */
  recognize: OcrRecognizer
  /** Reject the upload when text can't be read. Default `false`. */
  required?: boolean
  accept?: string
  maxSize?: number
  maxFiles?: number
  onResult?: (item: UploadItemData<TResult>, result: OcrResult) => void
  className?: string
}

/**
 * Upload scans, photos and PDFs and read their text: OCR runs after each
 * file is stored, with any engine. Shows the text, its confidence and any
 * fields the engine found, with copy and download.
 */
function OcrUpload<TResult = unknown>({
  adapter,
  recognize,
  required = false,
  accept = "image/png,image/jpeg,image/webp,image/tiff,application/pdf",
  maxSize = 20 * 1000 * 1000,
  maxFiles = 20,
  onResult,
  className,
}: OcrUploadProps<TResult>) {
  const recognizeRef = React.useRef(recognize)
  const onResultRef = React.useRef(onResult)
  React.useEffect(() => {
    recognizeRef.current = recognize
    onResultRef.current = onResult
  })

  const process = React.useCallback(
    (item: UploadItemData<TResult>, context: ProcessContext<TResult>) =>
      ocrProcess(recognizeRef.current, { required })(item, context),
    [required]
  )

  return (
    <Upload
      adapter={adapter}
      accept={accept}
      maxSize={maxSize}
      maxFiles={maxFiles}
      process={process}
      onSuccess={(item) => {
        const result = item.meta.ocr as OcrResult | undefined
        if (result)
          onResultRef.current?.(item as UploadItemData<TResult>, result)
      }}
      className={cn("flex flex-col gap-4", className)}
    >
      <UploadDropzone>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="ScanTextIcon"
              tabler="IconScan"
              hugeicons="ScanIcon"
              phosphor="ScanIcon"
              remixicon="RiScanLine"
            />
          </UploadDropzoneMedia>
          <UploadDropzoneTitle>Drop a scan, photo or PDF</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            The text is read as soon as the file is uploaded
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <OcrResults />
    </Upload>
  )
}

function OcrResults() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter((item) => item.status !== "cancelled")
  )
  const [selected, setSelected] = React.useState<string | null>(null)
  const current = items.find((item) => item.id === selected) ?? items.at(-1)

  if (!current) return null

  return (
    <div className="cn-upload-card grid gap-4 sm:grid-cols-[10rem_1fr]">
      <div className="flex flex-col gap-2">
        <div
          role="listbox"
          aria-label="Documents"
          className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible"
        >
          {items.map((item) => (
            <UploadItemContext.Provider key={item.id} value={item}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === current.id}
                onClick={() => setSelected(item.id)}
                className={cn(
                  "relative flex w-28 shrink-0 flex-col gap-1.5 rounded-lg border p-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-full",
                  item.id === current.id
                    ? "border-foreground/40 bg-muted"
                    : "hover:bg-muted/60"
                )}
              >
                <span className="relative aspect-4/3 overflow-hidden rounded-md border bg-background">
                  <UploadItemMedia
                    variant="cover"
                    className="[&_img]:object-contain"
                  />
                </span>
                <span className="truncate font-medium">{item.file.name}</span>
                <StatusText item={item} />
              </button>
            </UploadItemContext.Provider>
          ))}
        </div>
      </div>
      <UploadItemContext.Provider value={current}>
        <ResultPanel item={current} />
      </UploadItemContext.Provider>
    </div>
  )
}

function StatusText({ item }: { item: UploadItemData }) {
  const result = item.meta.ocr as OcrResult | undefined
  const label =
    item.status === "success"
      ? result
        ? `${countWords(result.text)} words`
        : item.meta.ocrError
          ? "No text read"
          : "Uploaded"
      : item.status === "processing"
        ? "Reading text…"
        : item.status === "error" || item.status === "rejected"
          ? "Failed"
          : `Uploading ${Math.round(item.progress.percent)}%`
  return (
    <span
      className={cn(
        "truncate text-muted-foreground",
        (item.status === "error" || item.status === "rejected") &&
          "text-destructive"
      )}
    >
      {label}
    </span>
  )
}

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length

function ResultPanel({ item }: { item: UploadItemData }) {
  const result = item.meta.ocr as OcrResult | undefined
  const error =
    (item.meta.ocrError as string | undefined) ??
    (item.status === "error" || item.status === "rejected"
      ? item.error?.message
      : undefined)
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  if (!result) {
    const reading = item.status === "processing"
    return (
      <div
        aria-live="polite"
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
      >
        {error ? (
          <>
            <p className="text-sm font-medium">Couldn&apos;t read this file</p>
            <p className="max-w-xs text-xs text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <div className="flex w-full max-w-56 flex-col gap-2" aria-hidden>
              {[92, 76, 84, 58].map((width, index) => (
                <span
                  key={index}
                  style={{ width: `${width}%` }}
                  className={cn(
                    "h-2 rounded-full bg-muted",
                    reading && "animate-pulse motion-reduce:animate-none"
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {reading ? "Reading text…" : "Uploading…"}
            </p>
            {!reading ? <UploadItemProgress className="max-w-56" /> : null}
          </>
        )}
      </div>
    )
  }

  const fields = Object.entries(result.fields ?? {})
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([result.text], { type: "text/plain" })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `${item.file.name.replace(/\.[^.]+$/, "")}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="cn-upload-card-title truncate">{item.file.name}</h3>
          <p className="cn-upload-card-description">
            {result.pages.length > 1 ? `${result.pages.length} pages · ` : ""}
            {countWords(result.text)} words
            {result.confidence != null
              ? ` · ${Math.round(result.confidence * 100)}% confidence`
              : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <NativeButton
            variant="outline"
            size="sm"
            disabled={!result.text}
            onClick={() =>
              void navigator.clipboard
                .writeText(result.text)
                .then(() => setCopied(true))
            }
          >
            {copied ? (
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
                data-icon="inline-start"
              />
            ) : (
              <IconPlaceholder
                lucide="CopyIcon"
                tabler="IconCopy"
                hugeicons="Copy01Icon"
                phosphor="CopyIcon"
                remixicon="RiFileCopyLine"
                data-icon="inline-start"
              />
            )}
            {copied ? "Copied" : "Copy"}
          </NativeButton>
          <NativeButton
            variant="outline"
            size="sm"
            disabled={!result.text}
            onClick={download}
          >
            <IconPlaceholder
              lucide="DownloadIcon"
              tabler="IconDownload"
              hugeicons="Download01Icon"
              phosphor="DownloadSimpleIcon"
              remixicon="RiDownloadLine"
              data-icon="inline-start"
            />
            .txt
          </NativeButton>
        </div>
      </div>
      {fields.length ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fields.map(([name, field]) => (
            <div
              key={name}
              className="flex min-w-0 flex-col rounded-md border px-2.5 py-1.5"
            >
              <dt className="truncate text-xs text-muted-foreground capitalize">
                {name
                  .replace(/([a-z])([A-Z])/g, "$1 $2")
                  .replace(/_/g, " ")
                  .toLowerCase()}
              </dt>
              <dd className="truncate text-sm font-medium">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {result.text ? (
        <pre
          tabIndex={0}
          aria-label={`Text from ${item.file.name}`}
          className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {result.text}
        </pre>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No text found in this file.
        </p>
      )}
    </div>
  )
}

export { OcrUpload, type OcrUploadProps }
