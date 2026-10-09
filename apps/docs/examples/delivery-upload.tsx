"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { DeliveryUpload } from "@/registry/default/blocks/delivery-upload"

export default function DeliveryUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "shipping")
  return (
    <div className="flex w-full justify-center">
      <DeliveryUpload uploader={uploader} />
    </div>
  )
}
