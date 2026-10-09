"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { StampUpload } from "@/registry/default/blocks/stamp-upload"

export default function StampUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "contracts")
  return (
    <div className="flex w-full justify-center">
      <StampUpload uploader={uploader} />
    </div>
  )
}
