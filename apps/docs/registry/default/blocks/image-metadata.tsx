"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadFooter,
  UploadItemActions,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemStatus,
  UploadSummary,
  UploadTrigger,
} from "@/registry/default/ui/upload"

export interface ImageMetadata<TResult = unknown> {
  item: UploadItemData<TResult>
  alt: string
  caption: string
}

interface ImageMetadataUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Default 8. */
  maxFiles?: number
  /** Require alt text before saving. Default `true`. */
  requireAlt?: boolean
  onSave?: (images: ImageMetadata<TResult>[]) => void
  className?: string
}

/**
 * Images upload in the background while people write alt text and
 * captions. Saving is blocked until every image has a description.
 */
function ImageMetadataUpload<TResult = unknown>({
  adapter,
  uploader,
  maxFiles = 8,
  requireAlt = true,
  onSave,
  className,
}: ImageMetadataUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <Editor
        requireAlt={requireAlt}
        onSave={onSave as ((images: ImageMetadata[]) => void) | undefined}
      />
    </Upload>
  )
}

function Editor({
  requireAlt,
  onSave,
}: {
  requireAlt: boolean
  onSave?: (images: ImageMetadata[]) => void
}) {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter(
      (item) => item.status !== "rejected" && item.status !== "cancelled"
    )
  )
  const missing = items.filter((item) => !String(item.meta.alt ?? "").trim())
  const pending = items.some((item) => item.status !== "success")

  if (items.length === 0) {
    return (
      <UploadDropzone>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="ImagePlusIcon"
              tabler="IconPhotoPlus"
              hugeicons="ImageAdd01Icon"
              phosphor="ImageIcon"
              remixicon="RiImageAddLine"
            />
          </UploadDropzoneMedia>
          <UploadDropzoneTitle>Add images</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Describe each one while it uploads
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <UploadItemContext.Provider key={item.id} value={item}>
            <MetadataRow item={item} requireAlt={requireAlt} />
          </UploadItemContext.Provider>
        ))}
      </ul>
      <UploadFooter className="justify-between">
        <div className="flex flex-col gap-0.5">
          <UploadSummary />
          {requireAlt && missing.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {missing.length} image{missing.length === 1 ? "" : "s"} still need
              {missing.length === 1 ? "s" : ""} alt text
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <UploadTrigger variant="ghost" size="sm">
            Add more
          </UploadTrigger>
          <NativeButton
            size="sm"
            disabled={pending || (requireAlt && missing.length > 0)}
            onClick={() =>
              onSave?.(
                items.map((item) => ({
                  item,
                  alt: String(item.meta.alt ?? "").trim(),
                  caption: String(item.meta.caption ?? "").trim(),
                }))
              )
            }
          >
            Save images
          </NativeButton>
        </div>
      </UploadFooter>
    </>
  )
}

function MetadataRow({
  item,
  requireAlt,
}: {
  item: UploadItemData
  requireAlt: boolean
}) {
  const { uploader } = useUploadContext()
  const alt = String(item.meta.alt ?? "")
  const caption = String(item.meta.caption ?? "")
  const altId = `${item.id}-alt`
  const captionId = `${item.id}-caption`

  return (
    <li className="cn-upload-card flex animate-in flex-col gap-3 p-3 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none sm:flex-row">
      <div className="flex flex-col gap-1.5 sm:w-32">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg border">
          <UploadItemMedia variant="cover" />
        </div>
        <UploadItemProgress />
        <UploadItemStatus className="sm:hidden" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{item.name}</span>
          <UploadItemStatus showIcon className="max-sm:hidden" />
          <UploadItemActions className="ms-auto" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label htmlFor={altId} className="text-xs font-medium">
              Alt text
            </label>
            {requireAlt && !alt.trim() ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <IconPlaceholder
                  lucide="TriangleAlertIcon"
                  tabler="IconAlertTriangle"
                  hugeicons="Alert02Icon"
                  phosphor="WarningIcon"
                  remixicon="RiErrorWarningLine"
                />
                Required
              </Badge>
            ) : null}
            <span className="ms-auto text-xs text-muted-foreground tabular-nums">
              {alt.length}/125
            </span>
          </div>
          <Input
            id={altId}
            maxLength={125}
            placeholder="Describe what's in the image"
            value={alt}
            onChange={(event) =>
              uploader.update(item.id, { meta: { alt: event.target.value } })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={captionId} className="text-xs font-medium">
            Caption <span className="text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id={captionId}
            rows={2}
            className="min-h-0 resize-none"
            placeholder="Shown under the image"
            value={caption}
            onChange={(event) =>
              uploader.update(item.id, {
                meta: { caption: event.target.value },
              })
            }
          />
        </div>
      </div>
    </li>
  )
}

export { ImageMetadataUpload, type ImageMetadataUploadProps }
