"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { AnimatedUploadQueue } from "@/registry/default/blocks/animated-upload-queue"

export default function AnimatedUploadQueueExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "documents")
  return <AnimatedUploadQueue uploader={uploader} />
}
