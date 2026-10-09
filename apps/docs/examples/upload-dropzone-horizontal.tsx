"use client"

import { PaperclipIcon } from "lucide-react"

import { demoAdapter } from "@/examples/_demo"
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

export default function UploadDropzoneHorizontal() {
  return (
    <Upload adapter={demoAdapter}>
      <UploadDropzone orientation="horizontal" clickable={false}>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <PaperclipIcon />
          </UploadDropzoneMedia>
          <div className="flex flex-col gap-0.5">
            <UploadDropzoneTitle>Attachments</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              Drag files here or browse
            </UploadDropzoneDescription>
          </div>
        </UploadDropzoneHeader>
        <UploadDropzoneContent>
          <UploadTrigger>Browse files</UploadTrigger>
        </UploadDropzoneContent>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
