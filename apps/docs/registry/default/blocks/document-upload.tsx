"use client"

import * as React from "react"
import {
  getFileExtension,
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import { useUploadItem, type UploadRootProps } from "@uploadcn/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneContent,
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
  UploadTrigger,
} from "@/registry/default/ui/upload"

const PRESETS = {
  documents: {
    accept: [
      ".pdf",
      ".doc",
      ".docx",
      ".odt",
      ".rtf",
      ".txt",
      ".md",
      ".xls",
      ".xlsx",
      ".csv",
      ".ppt",
      ".pptx",
    ],
    title: "Upload documents",
    description: "PDF, Word, Excel, PowerPoint, text or Markdown",
    maxFiles: 20,
    maxSize: 50 * 1000 * 1000,
  },
  pdf: {
    accept: [".pdf", "application/pdf"],
    title: "Upload PDFs",
    description: "PDF files only",
    maxFiles: 20,
    maxSize: 100 * 1000 * 1000,
  },
  resume: {
    accept: [".pdf", ".doc", ".docx"],
    title: "Upload your résumé",
    description: "PDF or Word, up to 10 MB",
    maxFiles: 1,
    maxSize: 10 * 1000 * 1000,
  },
} as const

interface DocumentUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** `documents` (default), `pdf` or `resume` (single PDF/Word file). */
  variant?: keyof typeof PRESETS
  maxFiles?: number
  maxSize?: number
  name?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

function DocumentUpload<TResult = unknown>({
  adapter,
  uploader,
  variant = "documents",
  maxFiles,
  maxSize,
  name,
  onSuccess,
  className,
}: DocumentUploadProps<TResult>) {
  const preset = PRESETS[variant]
  const single = (maxFiles ?? preset.maxFiles) === 1
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: preset.accept,
            maxFiles: maxFiles ?? preset.maxFiles,
            maxSize: maxSize ?? preset.maxSize,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      name={name}
      className={className}
    >
      <UploadDropzone orientation="horizontal" clickable={false}>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="FileTextIcon"
              tabler="IconFileDescription"
              hugeicons="File01Icon"
              phosphor="FileTextIcon"
              remixicon="RiFileTextLine"
            />
          </UploadDropzoneMedia>
          <div className="flex flex-col gap-0.5">
            <UploadDropzoneTitle>{preset.title}</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              {preset.description}
            </UploadDropzoneDescription>
          </div>
        </UploadDropzoneHeader>
        <UploadDropzoneContent>
          <UploadTrigger>
            {single ? "Choose file" : "Browse files"}
          </UploadTrigger>
        </UploadDropzoneContent>
      </UploadDropzone>
      <UploadList>
        <UploadItem>
          <UploadItemMedia variant="icon" />
          <UploadItemContent>
            <div className="flex min-w-0 items-center gap-2">
              <UploadItemTitle />
              <DocumentType />
            </div>
            <UploadItemDescription />
          </UploadItemContent>
          <UploadItemActions />
          <UploadItemProgress />
        </UploadItem>
      </UploadList>
    </Upload>
  )
}

function DocumentType() {
  const item = useUploadItem()
  const extension = getFileExtension(item.name)
  if (!extension) return null
  return (
    <Badge variant="secondary" className="shrink-0 uppercase">
      {extension}
    </Badge>
  )
}

export { DocumentUpload, type DocumentUploadProps }
