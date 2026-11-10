"use client"

import { FileUpload } from "@/registry/default/blocks/file-upload"

export default function PasteUploadExample() {
  return (
    <FileUpload
      paste
      accept="image/*"
      maxSize={10 * 1000 * 1000}
      maxFiles={6}
      title="Drop, browse or paste a screenshot"
    />
  )
}
