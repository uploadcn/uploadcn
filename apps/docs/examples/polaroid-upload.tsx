"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { PolaroidUpload } from "@/registry/default/blocks/polaroid-upload"

export default function PolaroidUploadExample() {
  const uploader = useUploader({
    adapter: demoAdapter,
    accept: "image/*",
    maxFiles: 8,
  })
  useSampleFiles(uploader, "images")
  return <PolaroidUpload uploader={uploader} />
}
