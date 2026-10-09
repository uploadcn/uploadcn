"use client"

import { DocumentUpload } from "@/registry/default/blocks/document-upload"

export default function DocumentUploadExample() {
  return (
    <div className="flex flex-col gap-8">
      <DocumentUpload />
      <DocumentUpload variant="resume" name="resume" />
    </div>
  )
}
