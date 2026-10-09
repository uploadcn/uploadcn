"use client"

import { s3Adapter } from "@uploadcn/core"

import { demoTransport } from "@/examples/_demo"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneContent,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadQueue,
  UploadTrigger,
} from "@/registry/default/ui/upload"

const adapter = s3Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
})

export default function DragDropExample() {
  return (
    <Upload adapter={adapter}>
      <UploadDropzone clickable={false}>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon" />
          <UploadDropzoneTitle>Drag files or folders here</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Folders are expanded recursively
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
        <UploadDropzoneContent>
          <UploadTrigger>Browse files</UploadTrigger>
        </UploadDropzoneContent>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
