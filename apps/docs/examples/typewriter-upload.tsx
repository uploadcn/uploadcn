"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { TypewriterUpload } from "@/registry/default/blocks/typewriter-upload"

export default function TypewriterUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "documents")
  return (
    <div className="flex w-full justify-center">
      <TypewriterUpload uploader={uploader} />
    </div>
  )
}
