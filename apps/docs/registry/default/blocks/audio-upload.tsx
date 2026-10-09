"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  useFilePreview,
  useUploadItem,
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
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
} from "@/registry/default/ui/upload"

interface AudioUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Longest allowed recording, in seconds. */
  maxDuration?: number
  maxFiles?: number
  /** Default 500 MB. */
  maxSize?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/** Audio uploads (podcasts, voice notes, music) with an inline player per file. */
function AudioUpload<TResult = unknown>({
  adapter,
  uploader,
  maxDuration,
  maxFiles = 10,
  maxSize = 500 * 1000 * 1000,
  onSuccess,
  className,
}: AudioUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "audio/*",
            maxFiles,
            maxSize,
            media: maxDuration ? { maxDuration } : undefined,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadDropzone orientation="horizontal" size="sm">
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="MicIcon"
              tabler="IconMicrophone"
              hugeicons="VoiceIcon"
              phosphor="MicrophoneIcon"
              remixicon="RiMicLine"
            />
          </UploadDropzoneMedia>
          <div className="flex flex-col gap-0.5">
            <UploadDropzoneTitle>Add audio</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              MP3, WAV, M4A, OGG or FLAC
            </UploadDropzoneDescription>
          </div>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <UploadList>
        <UploadItem>
          <UploadItemMedia variant="icon" />
          <UploadItemContent>
            <UploadItemTitle />
            <UploadItemDescription />
          </UploadItemContent>
          <UploadItemActions />
          <UploadItemProgress />
          <AudioPlayer />
        </UploadItem>
      </UploadList>
    </Upload>
  )
}

function AudioPlayer() {
  const item = useUploadItem()
  const url = useFilePreview(
    item.status === "rejected" ? null : item.originalFile
  )
  if (!url) return null
  return (
    <audio
      src={url}
      controls
      preload="metadata"
      className="h-9 basis-full"
      aria-label={`Play ${item.name}`}
    />
  )
}

export { AudioUpload, type AudioUploadProps }
