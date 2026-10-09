"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { UploadDock } from "@/registry/default/blocks/upload-dock"

export default function UploadDockExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "images")
  return <UploadDock uploader={uploader} />
}
