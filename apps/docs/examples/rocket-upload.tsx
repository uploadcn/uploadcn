"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { RocketUpload } from "@/registry/default/blocks/rocket-upload"

export default function RocketUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "artifacts")
  return (
    <div className="flex w-full justify-center">
      <RocketUpload uploader={uploader} />
    </div>
  )
}
