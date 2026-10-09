"use client"

import * as React from "react"
import {
  type ProcessContext,
  type UploadAdapter,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import { useUploadItem } from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
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
} from "@/registry/default/ui/upload"

/** Pipeline stages after the bytes are stored. Customize to match your backend. */
export const INGEST_STAGES = [
  "upload",
  "parse",
  "chunk",
  "embed",
  "index",
] as const
export type IngestStage = (typeof INGEST_STAGES)[number]

const STAGE_LABELS: Record<IngestStage, string> = {
  upload: "Upload",
  parse: "Parse",
  chunk: "Chunk",
  embed: "Embed",
  index: "Index",
}

export type IngestProcess<TResult> = (
  item: UploadItemData<TResult>,
  context: ProcessContext<TResult> & { setStage: (stage: IngestStage) => void }
) => Promise<TResult | void>

interface DocumentIngestProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /**
   * Drives server-side ingestion after upload: call your API, then report
   * progress with `setStage` (e.g. from polling or server-sent events).
   */
  ingest: IngestProcess<TResult>
  accept?: string[]
  maxFiles?: number
  className?: string
}

/**
 * Document ingestion for RAG and knowledge bases: upload, then follow each
 * file through parsing, chunking, embedding and indexing.
 */
function DocumentIngest<TResult = unknown>({
  adapter,
  ingest,
  accept = [".pdf", ".docx", ".txt", ".md", ".html", ".csv", ".json"],
  maxFiles = 50,
  className,
}: DocumentIngestProps<TResult>) {
  const ingestRef = React.useRef(ingest)
  React.useEffect(() => {
    ingestRef.current = ingest
  })

  const process = React.useCallback(
    (item: UploadItemData<TResult>, context: ProcessContext<TResult>) =>
      ingestRef.current(item, {
        ...context,
        setStage: (stage) => context.setMeta({ stage }),
      }),
    []
  )

  return (
    <Upload
      adapter={adapter}
      accept={accept}
      maxFiles={maxFiles}
      process={process}
      className={className}
    >
      <UploadDropzone>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="DatabaseIcon"
              tabler="IconDatabase"
              hugeicons="Database01Icon"
              phosphor="DatabaseIcon"
              remixicon="RiDatabase2Line"
            />
          </UploadDropzoneMedia>
          <UploadDropzoneTitle>Add to knowledge base</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            PDF, Word, Markdown, HTML, CSV or JSON
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <UploadList>
        <UploadItem className="items-start">
          <UploadItemMedia variant="icon" />
          <UploadItemContent className="gap-2">
            <div className="flex flex-col gap-0.5">
              <UploadItemTitle />
              <UploadItemDescription />
            </div>
            <IngestStages />
          </UploadItemContent>
          <UploadItemActions />
          <UploadItemProgress />
        </UploadItem>
      </UploadList>
    </Upload>
  )
}

function getCurrentStage(item: UploadItemData): number {
  if (item.status === "success") return INGEST_STAGES.length
  if (item.status === "processing" || item.status === "scanning") {
    const stage = item.meta.stage as IngestStage | undefined
    return stage ? INGEST_STAGES.indexOf(stage) : 1
  }
  return 0
}

function IngestStages() {
  const item = useUploadItem()
  const current = getCurrentStage(item)
  const failed = item.status === "error" || item.status === "rejected"
  return (
    <ol
      className="flex flex-wrap items-center gap-1 text-xs"
      aria-label="Ingestion progress"
    >
      {INGEST_STAGES.map((stage, index) => {
        const done = index < current
        const active = index === current && !failed && item.status !== "success"
        return (
          <li
            key={stage}
            aria-current={active ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground transition-colors",
              done &&
                "border-transparent bg-secondary text-secondary-foreground",
              active && "border-foreground/20 text-foreground",
              failed &&
                index === current &&
                "border-destructive/40 text-destructive"
            )}
          >
            {done ? (
              <IconPlaceholder
                lucide="CheckIcon"
                tabler="IconCheck"
                hugeicons="Tick02Icon"
                phosphor="CheckIcon"
                remixicon="RiCheckLine"
                className="size-3"
                aria-hidden
              />
            ) : null}
            {active ? (
              <span
                className="size-1.5 animate-pulse rounded-full bg-foreground motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
            {STAGE_LABELS[stage]}
          </li>
        )
      })}
    </ol>
  )
}

export { DocumentIngest, type DocumentIngestProps }
