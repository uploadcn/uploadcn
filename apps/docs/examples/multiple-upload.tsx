"use client"

import { FileUpload } from "@/registry/default/blocks/file-upload"

export default function MultipleUploadExample() {
  return (
    <FileUpload
      maxFiles={10}
      maxSize={25 * 1000 * 1000}
      title="Upload up to 10 files"
    />
  )
}
