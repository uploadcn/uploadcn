"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { VinylUpload } from "@/registry/default/blocks/vinyl-upload"

export default function VinylUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "audio")
  return (
    <div className="flex w-full justify-center">
      <VinylUpload uploader={uploader} />
    </div>
  )
}
