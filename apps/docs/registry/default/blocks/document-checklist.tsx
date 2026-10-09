"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  UploadProgress,
  UploadSlot,
} from "@/registry/default/ui/upload"

export interface ChecklistItem {
  name: string
  label: string
  description?: string
  accept?: string
  required?: boolean
}

const DEFAULT_ITEMS: ChecklistItem[] = [
  {
    name: "damage-photo",
    label: "Photo of the damage",
    description: "A clear, well-lit photo",
    accept: "image/*",
    required: true,
  },
  {
    name: "police-report",
    label: "Police report",
    description: "PDF or photo, if one was filed",
    accept: "application/pdf,image/*",
  },
  {
    name: "repair-estimate",
    label: "Repair estimate",
    description: "From a licensed repair shop",
    accept: "application/pdf,image/*",
    required: true,
  },
  {
    name: "receipt",
    label: "Proof of purchase",
    description: "Receipt or invoice",
    accept: "application/pdf,image/*",
  },
]

interface DocumentChecklistProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  title?: string
  description?: string
  /** What to collect. Default: an insurance claim. */
  items?: ChecklistItem[]
  /** Default 25 MB per file. */
  maxSize?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A checklist of documents to collect, insurance claims, onboarding,
 * visas, loans. Each requirement is its own slot and ticks off when its
 * file is uploaded.
 */
function DocumentChecklist<TResult = unknown>({
  adapter,
  uploader,
  title = "Supporting documents",
  description = "Upload what you have. Required items are marked.",
  items = DEFAULT_ITEMS,
  maxSize = 25 * 1000 * 1000,
  onSuccess,
  className,
}: DocumentChecklistProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, maxSize, onSuccess }) as UploadRootProps<TResult>)}
      className={className}
    >
      <Checklist title={title} description={description} items={items} />
    </Upload>
  )
}

function Checklist({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: ChecklistItem[]
}) {
  const { uploader } = useUploadContext()
  const files = useUploadSelector(uploader, (state) => state.items)
  const statusOf = (name: string) =>
    files.find((file) => file.meta.slot === name && file.status !== "cancelled")
      ?.status
  const required = items.filter((item) => item.required)
  const requiredDone = required.filter(
    (item) => statusOf(item.name) === "success"
  ).length
  const uploading = files.some((file) => file.status === "uploading")

  return (
    <div className="cn-upload-card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="cn-upload-card-title">{title}</h3>
          <p className="cn-upload-card-description text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge
          variant={requiredDone === required.length ? "default" : "secondary"}
          className="shrink-0 tabular-nums"
        >
          {requiredDone}/{required.length} required
        </Badge>
      </div>
      {uploading ? <UploadProgress /> : null}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const status = statusOf(item.name)
          const done = status === "success"
          return (
            <li key={item.name} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-4 shrink-0 text-muted-foreground",
                  done && "text-primary"
                )}
              >
                {done ? (
                  <IconPlaceholder
                    lucide="CircleCheckIcon"
                    tabler="IconCircleCheckFilled"
                    hugeicons="CheckmarkCircle01Icon"
                    phosphor="CheckCircleIcon"
                    remixicon="RiCheckboxCircleFill"
                    className="size-4 animate-in zoom-in-50 motion-reduce:animate-none"
                  />
                ) : (
                  <IconPlaceholder
                    lucide="CircleIcon"
                    tabler="IconCircle"
                    hugeicons="CircleIcon"
                    phosphor="CircleIcon"
                    remixicon="RiCheckboxBlankCircleLine"
                    className="size-4"
                  />
                )}
                <span className="sr-only">{done ? "Done" : "To do"}</span>
              </span>
              <UploadSlot
                name={item.name}
                label={item.label}
                description={item.description}
                accept={item.accept}
                required={item.required}
                icon={
                  <IconPlaceholder
                    lucide="FileTextIcon"
                    tabler="IconFileDescription"
                    hugeicons="File01Icon"
                    phosphor="FileTextIcon"
                    remixicon="RiFileTextLine"
                  />
                }
                className="flex-1"
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { DocumentChecklist, type DocumentChecklistProps }
