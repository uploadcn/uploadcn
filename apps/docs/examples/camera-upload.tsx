"use client"

import { demoAdapter } from "@/examples/_demo"
import { CameraUpload } from "@/registry/default/blocks/camera-upload"

export default function CameraUploadExample() {
  return (
    <div className="w-full max-w-md">
      <CameraUpload adapter={demoAdapter} />
    </div>
  )
}
