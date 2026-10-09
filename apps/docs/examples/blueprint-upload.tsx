"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { BlueprintUpload } from "@/registry/default/blocks/blueprint-upload"

export default function BlueprintUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "drawings")
  return (
    <div className="flex w-full justify-center">
      <BlueprintUpload uploader={uploader} />
    </div>
  )
}
