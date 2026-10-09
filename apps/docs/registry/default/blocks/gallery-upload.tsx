"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import { imageTransform } from "@uploadcn/core/image"
import {
  useUploadContext,
  useUploadItem,
  useUploadProgress,
  type UploadRootProps,
} from "@uploadcn/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadEmpty,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
  UploadProgress,
  UploadTrigger,
} from "@/registry/default/ui/upload"

const optimize = imageTransform({
  maxWidth: 2560,
  maxHeight: 2560,
  type: "image/webp",
})

interface GalleryUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  maxFiles?: number
  /** Downscale and convert photos to WebP before uploading. Default `true`. */
  optimize?: boolean
  onComplete?: (items: UploadItemData<TResult>[]) => void
  className?: string
}

/** A photo gallery: the whole card is a drop target, photos upload four at a time. */
function GalleryUpload<TResult = unknown>({
  adapter,
  uploader,
  maxFiles = 50,
  optimize: shouldOptimize = true,
  onComplete,
  className,
}: GalleryUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles,
            concurrency: 4,
            transform: shouldOptimize ? optimize : undefined,
            onComplete,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadDropzone
        variant="outline"
        clickable={false}
        size="sm"
        className="items-stretch"
      >
        <GalleryHeader />
        <UploadEmpty>
          <UploadDropzoneHeader className="mx-auto py-8">
            <UploadDropzoneMedia variant="icon">
              <IconPlaceholder
                lucide="ImagesIcon"
                tabler="IconLibraryPhoto"
                hugeicons="Album01Icon"
                phosphor="ImagesIcon"
                remixicon="RiGalleryLine"
              />
            </UploadDropzoneMedia>
            <UploadDropzoneTitle>Drag photos anywhere here</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              Resized and converted to WebP before upload
            </UploadDropzoneDescription>
          </UploadDropzoneHeader>
        </UploadEmpty>
        <UploadList className="grid-cols-2 sm:grid-cols-3" variant="grid">
          <UploadItem variant="tile" className="aspect-4/3">
            <UploadItemMedia variant="cover" />
            <UploadItemActions />
            <UploadItemContent>
              <UploadItemTitle />
              <GallerySavings />
              <UploadItemProgress />
            </UploadItemContent>
          </UploadItem>
        </UploadList>
      </UploadDropzone>
    </Upload>
  )
}

function GalleryHeader() {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-left">
        <div className="flex flex-col gap-0.5">
          <UploadDropzoneTitle>Gallery</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            {summary.total === 0
              ? `Up to 50 photos`
              : `${summary.counts.success} of ${summary.total} photos uploaded`}
          </UploadDropzoneDescription>
        </div>
        <UploadTrigger>
          <IconPlaceholder
            lucide="ImagesIcon"
            tabler="IconLibraryPhoto"
            hugeicons="Album01Icon"
            phosphor="ImagesIcon"
            remixicon="RiGalleryLine"
            data-icon="inline-start"
          />
          Add photos
        </UploadTrigger>
      </div>
      {summary.isUploading ? <UploadProgress /> : null}
    </div>
  )
}

function GallerySavings() {
  const item = useUploadItem()
  if (item.file === item.originalFile) return null
  const saved = 1 - item.file.size / item.originalFile.size
  if (saved <= 0) return null
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {Math.round(saved * 100)}% smaller
    </span>
  )
}

export { GalleryUpload, type GalleryUploadProps }
