"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { UploadTable } from "@/registry/default/blocks/upload-table"

export default function UploadTableExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)
  return <UploadTable uploader={uploader} title="Project files" />
}
