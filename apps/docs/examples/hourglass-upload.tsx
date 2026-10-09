"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { HourglassUpload } from "@/registry/default/blocks/hourglass-upload"

export default function HourglassUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "artifacts")
  return (
    <div className="flex w-full justify-center">
      <HourglassUpload uploader={uploader} />
    </div>
  )
}
