"use client"

import { MiB, mockAdapter } from "@uploadcn/core"

import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

/** A resumable adapter continues from the last byte after a pause. */
const adapter = mockAdapter({ speed: 1 * MiB, resumable: true })

export default function PauseResumeExample() {
  return (
    <Upload adapter={adapter}>
      <UploadDropzone>
        <UploadDropzoneTitle>Drop a large file</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Pause it midway, then resume, progress continues where it stopped
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
