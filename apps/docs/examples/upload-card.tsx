"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import {
  Upload,
  UploadClear,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadFooter,
  UploadHeader,
  UploadProgress,
  UploadQueue,
  UploadSummary,
  UploadTrigger,
} from "@/registry/default/ui/upload"

export default function UploadCardExample() {
  const uploader = useUploader({ adapter: demoAdapter, maxFiles: 10 })
  useSampleFiles(uploader)
  return (
    <Upload
      uploader={uploader}
      className="max-w-lg rounded-xl border bg-card p-4 shadow-xs"
    >
      <UploadHeader>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-medium">Attachments</h3>
          <UploadSummary />
        </div>
        <UploadTrigger size="sm" variant="outline">
          Browse
        </UploadTrigger>
      </UploadHeader>
      <UploadProgress />
      <UploadDropzone size="sm" variant="muted">
        <UploadDropzoneTitle>Drop more files</UploadDropzoneTitle>
        <UploadDropzoneDescription>Up to 10 files</UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue size="sm" />
      <UploadFooter>
        <UploadClear>Clear finished</UploadClear>
      </UploadFooter>
    </Upload>
  )
}
