"use client"

import { MiB, mockAdapter } from "@uploadcn/core"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadProgress,
  UploadQueue,
} from "@/registry/default/ui/upload"

/** Simulated ~1.5 MB/s per file so the queue is visible. */
const adapter = mockAdapter({ speed: 1.5 * MiB, chunkSize: 2 * MiB })

export default function UploadQueueExample() {
  return (
    <Upload adapter={adapter} concurrency={2} maxFiles={20}>
      <UploadDropzone>
        <UploadDropzoneTitle>Drop a handful of files</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Two upload at a time; the rest wait in the queue
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadProgress />
      <UploadQueue />
    </Upload>
  )
}
