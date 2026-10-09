"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { BatteryUpload } from "@/registry/default/blocks/battery-upload"

export default function BatteryUploadExample() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "images")
  return (
    <div className="flex w-full justify-center">
      <BatteryUpload uploader={uploader} />
    </div>
  )
}
