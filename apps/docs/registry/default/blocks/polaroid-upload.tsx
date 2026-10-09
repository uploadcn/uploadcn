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
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

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
  UploadItemMedia,
  UploadItemProgress,
  UploadItemStatus,
  UploadItemTitle,
} from "@/registry/default/ui/upload"

interface PolaroidUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  maxFiles?: number
  /** Default 20 MB. */
  maxSize?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** A stable tilt between -7° and 7° per photo. */
function tilt(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0
  }
  return (Math.abs(hash) % 15) - 7
}

/** Photos drop onto the table like polaroids; hover straightens them. */
function PolaroidUpload<TResult = unknown>({
  adapter,
  uploader,
  maxFiles = 8,
  maxSize = 20 * 1000 * 1000,
  onSuccess,
  className,
}: PolaroidUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*",
            maxFiles,
            maxSize,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadDropzone variant="muted" size="sm">
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="CameraIcon"
              tabler="IconCamera"
              hugeicons="Camera01Icon"
              phosphor="CameraIcon"
              remixicon="RiCameraLine"
            />
          </UploadDropzoneMedia>
          <UploadDropzoneTitle>Drop your photos</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Up to {maxFiles} images
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <Table />
    </Upload>
  )
}

function Table() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)
  const reduceMotion = useReducedMotion()
  const photos = items.filter(
    (item) => item.status !== "cancelled" && item.status !== "rejected"
  )
  if (photos.length === 0) return null

  return (
    <ul
      role="list"
      aria-label="Photos"
      className="flex flex-wrap justify-center gap-x-3 gap-y-4 py-4"
    >
      <AnimatePresence>
        {photos.map((item) => (
          <UploadItemContext.Provider key={item.id} value={item}>
            <UploadItem
              item={item}
              variant="default"
              className="w-36 flex-col flex-nowrap items-stretch gap-2 rounded-sm border-border/60 bg-card p-2 pb-3 shadow-md"
              render={
                <motion.li
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: -48, rotate: 0, scale: 1.12 }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotate: tilt(item.id),
                    scale: 1,
                  }}
                  exit={
                    reduceMotion
                      ? undefined
                      : {
                          opacity: 0,
                          scale: 0.8,
                          rotate: 0,
                          transition: { duration: 0.18 },
                        }
                  }
                  whileHover={
                    reduceMotion ? undefined : { rotate: 0, y: -6, scale: 1.04 }
                  }
                  whileFocus={
                    reduceMotion ? undefined : { rotate: 0, y: -6, scale: 1.04 }
                  }
                  transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
                  style={{ zIndex: 1 }}
                />
              }
            >
              <div className="relative aspect-square overflow-hidden rounded-xs">
                <UploadItemMedia variant="cover" />
                <UploadItemProgress className="absolute inset-x-2 bottom-2 w-auto bg-background/60" />
                <UploadItemActions className="absolute top-1 right-1 rounded-md bg-background/85 opacity-0 backdrop-blur-sm transition-opacity group-focus-within/upload-item:opacity-100 group-hover/upload-item:opacity-100" />
              </div>
              <UploadItemTitle className="px-0.5 text-xs" />
              <UploadItemStatus className="px-0.5" />
            </UploadItem>
          </UploadItemContext.Provider>
        ))}
      </AnimatePresence>
    </ul>
  )
}

export { PolaroidUpload, type PolaroidUploadProps }
