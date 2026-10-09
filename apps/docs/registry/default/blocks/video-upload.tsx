"use client"

import * as React from "react"
import {
  formatDuration,
  getMediaDuration,
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  useFilePreview,
  useUploadContext,
  useUploadItem,
  useUploadSelector,
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
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
} from "@/registry/default/ui/upload"

/** Large videos switch to resumable multipart uploads automatically. */

interface VideoUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Longest allowed video, in seconds. */
  maxDuration?: number
  /** Default 2 GB. */
  maxSize?: number
  maxFiles?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** Video uploads with inline playback, duration limits and resumable transfers. */
function VideoUpload<TResult = unknown>({
  adapter,
  uploader,
  maxDuration,
  maxSize = 2 * 1000 * 1000 * 1000,
  maxFiles = 1,
  onSuccess,
  className,
}: VideoUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "video/*",
            maxSize,
            maxFiles,
            media: maxDuration ? { maxDuration } : undefined,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <VideoDropzone maxDuration={maxDuration} />
      <UploadList>
        <UploadItem className="flex-col flex-nowrap items-stretch">
          <VideoPlayer />
          <div className="flex min-w-0 items-start gap-3">
            <UploadItemContent>
              <UploadItemTitle />
              <UploadItemDescription />
              <VideoDuration />
            </UploadItemContent>
            <UploadItemActions />
          </div>
          <UploadItemProgress />
        </UploadItem>
      </UploadList>
    </Upload>
  )
}

function VideoDropzone({ maxDuration }: { maxDuration?: number }) {
  const { uploader } = useUploadContext()
  const empty = useUploadSelector(uploader, (state) =>
    state.items.every((item) => item.status === "rejected")
  )
  if (!empty) return null
  return (
    <UploadDropzone>
      <UploadDropzoneHeader>
        <UploadDropzoneMedia variant="icon">
          <IconPlaceholder
            lucide="FilmIcon"
            tabler="IconMovie"
            hugeicons="Film01Icon"
            phosphor="FilmStripIcon"
            remixicon="RiFilmLine"
          />
        </UploadDropzoneMedia>
        <UploadDropzoneTitle>Upload a video</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          MP4, WebM or MOV
          {maxDuration ? ` · up to ${formatDuration(maxDuration)}` : ""} ·
          resumable for large files
        </UploadDropzoneDescription>
      </UploadDropzoneHeader>
    </UploadDropzone>
  )
}

function VideoPlayer() {
  const item = useUploadItem()
  const url = useFilePreview(
    item.status === "rejected" ? null : item.originalFile
  )
  if (!url) return null
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      className="aspect-video w-full animate-in rounded-md bg-muted object-contain fade-in-0 motion-reduce:animate-none"
      aria-label={`Preview of ${item.name}`}
    />
  )
}

function VideoDuration() {
  const item = useUploadItem()
  const [duration, setDuration] = React.useState<number | null>(null)
  React.useEffect(() => {
    const controller = new AbortController()
    getMediaDuration(item.originalFile, { signal: controller.signal })
      .then(setDuration)
      .catch(() => {})
    return () => controller.abort()
  }, [item.originalFile])
  if (!duration) return null
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      Duration {formatDuration(duration)}
    </span>
  )
}

export { VideoUpload, type VideoUploadProps }
