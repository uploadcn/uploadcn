"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import { compressImage } from "@uploadcn/core/image"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { useCropQueue } from "@/registry/default/hooks/use-crop-queue"
import { ImageCropper } from "@/registry/default/ui/image-cropper"
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
  UploadItemMedia,
  UploadItemProgress,
  UploadItemStatus,
  UploadList,
} from "@/registry/default/ui/upload"

interface ImageUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Open a crop dialog for every image. Pass `{ aspect }` to fix the ratio. */
  crop?: boolean | { aspect?: number }
  /** Resize and re-encode images in the browser before uploading. */
  compress?: boolean
  /** Longest edge after compression or cropping. Default 2048. */
  maxWidth?: number
  maxHeight?: number
  /** Encoder quality, 0–1. Default 0.82. */
  quality?: number
  /** Output format. Defaults to WebP when compressing. */
  type?: "image/webp" | "image/jpeg" | "image/avif" | "image/png"
  maxFiles?: number
  /** Maximum size of the original file. Default 20 MB. */
  maxSize?: number
  /** Minimum dimensions of the original image. */
  minWidth?: number
  minHeight?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** An image grid with optional cropping and in-browser compression. */
function ImageUpload<TResult = unknown>({
  adapter,
  crop = false,
  compress = false,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 0.82,
  type,
  maxFiles = 12,
  maxSize = 20 * 1000 * 1000,
  minWidth,
  minHeight,
  onSuccess,
  className,
}: ImageUploadProps<TResult>) {
  const crops = useCropQueue()
  const { request } = crops
  const output = React.useMemo(
    () => ({
      maxWidth,
      maxHeight,
      quality,
      type: type ?? (compress ? ("image/webp" as const) : undefined),
    }),
    [maxWidth, maxHeight, quality, type, compress]
  )

  const transform = React.useCallback(
    async (file: File) => {
      let result = crop ? await request(file) : file
      if (compress) result = await compressImage(result, output)
      return result
    },
    [crop, compress, request, output]
  )

  return (
    <Upload
      adapter={adapter}
      accept="image/*"
      maxFiles={maxFiles}
      maxSize={maxSize}
      image={minWidth || minHeight ? { minWidth, minHeight } : undefined}
      transform={crop || compress ? transform : undefined}
      onSuccess={onSuccess}
      className={className}
    >
      <UploadDropzone size="sm">
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
            PNG, JPG, WebP or AVIF
            {crop ? " · you'll crop each one" : ""}
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <UploadList variant="grid">
        <UploadItem variant="tile">
          <UploadItemMedia variant="cover" />
          <UploadItemActions />
          <UploadItemContent>
            <UploadItemStatus />
            <UploadItemProgress />
          </UploadItemContent>
        </UploadItem>
      </UploadList>
      <ImageCropper
        file={crops.current}
        aspect={typeof crop === "object" ? crop.aspect : undefined}
        output={output}
        onCrop={crops.complete}
        onCancel={crops.skip}
        description={
          crops.pending > 1
            ? `${crops.pending - 1} more image(s) waiting.`
            : undefined
        }
      />
    </Upload>
  )
}

export { ImageUpload, type ImageUploadProps }
