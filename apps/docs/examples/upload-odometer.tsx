"use client"

import { useUploader } from "@uploadcn/react"

import { useSampleFiles } from "@/examples/_demo"
import { UploadOdometer } from "@/registry/default/blocks/upload-odometer"

export default function UploadOdometerExample() {
  const uploader = useUploader({})
  useSampleFiles(uploader, "documents")
  return (
    <div className="w-full max-w-md">
      <UploadOdometer uploader={uploader} />
    </div>
  )
}
