"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { UploadStack } from "@/registry/default/blocks/upload-stack"

export default function UploadStackExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)
  return <UploadStack uploader={uploader} />
}
