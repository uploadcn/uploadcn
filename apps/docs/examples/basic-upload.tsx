"use client"

import { FileUpload } from "@/registry/default/blocks/file-upload"

export default function BasicUploadExample() {
  return <FileUpload maxSize={50 * 1000 * 1000} />
}
