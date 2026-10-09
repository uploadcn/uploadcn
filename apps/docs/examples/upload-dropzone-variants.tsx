"use client"

import { FileTextIcon, ImageIcon } from "lucide-react"

import { demoAdapter } from "@/examples/_demo"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
} from "@/registry/default/ui/upload"

export default function UploadDropzoneVariants() {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-3">
      <Upload adapter={demoAdapter}>
        <UploadDropzone size="sm">
          <UploadDropzoneHeader>
            <UploadDropzoneMedia variant="icon" />
            <UploadDropzoneTitle>Default</UploadDropzoneTitle>
            <UploadDropzoneDescription>Dashed border</UploadDropzoneDescription>
          </UploadDropzoneHeader>
        </UploadDropzone>
      </Upload>
      <Upload adapter={demoAdapter}>
        <UploadDropzone variant="muted" size="sm">
          <UploadDropzoneHeader>
            <UploadDropzoneMedia variant="icon">
              <ImageIcon />
            </UploadDropzoneMedia>
            <UploadDropzoneTitle>Muted</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              Filled surface
            </UploadDropzoneDescription>
          </UploadDropzoneHeader>
        </UploadDropzone>
      </Upload>
      <Upload adapter={demoAdapter}>
        <UploadDropzone variant="outline" size="sm">
          <UploadDropzoneHeader>
            <UploadDropzoneMedia>
              <FileTextIcon />
            </UploadDropzoneMedia>
            <UploadDropzoneTitle>Outline</UploadDropzoneTitle>
            <UploadDropzoneDescription>Card surface</UploadDropzoneDescription>
          </UploadDropzoneHeader>
        </UploadDropzone>
      </Upload>
    </div>
  )
}
