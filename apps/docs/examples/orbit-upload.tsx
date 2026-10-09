"use client"

import { useUploader } from "@uploadcn/react"

import { useSampleFiles } from "@/examples/_demo"
import { OrbitUpload } from "@/registry/default/blocks/orbit-upload"

export default function OrbitUploadExample() {
  const uploader = useUploader({})
  useSampleFiles(uploader, "images")
  return <OrbitUpload uploader={uploader} />
}
