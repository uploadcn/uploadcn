"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { UploadTerminal } from "@/registry/default/blocks/upload-terminal"

export default function UploadTerminalExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "documents")
  return (
    <UploadTerminal
      uploader={uploader}
      title="deploy/assets"
      className="max-w-xl"
    />
  )
}
