"use client"

import { UploadConfetti } from "@/registry/default/blocks/upload-confetti"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

export default function UploadConfettiExample() {
  return (
    <Upload className="relative max-w-md">
      <UploadDropzone>
        <UploadDropzoneTitle>Finish a batch to celebrate</UploadDropzoneTitle>
        <UploadDropzoneDescription>
          Confetti uses your theme's colors
        </UploadDropzoneDescription>
      </UploadDropzone>
      <UploadQueue size="sm" />
      <UploadConfetti />
    </Upload>
  )
}
