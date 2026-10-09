"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { ProgressRingUpload } from "@/registry/default/blocks/progress-ring-upload"

export default function ProgressRingUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)
  return <ProgressRingUpload uploader={uploader} />
}
