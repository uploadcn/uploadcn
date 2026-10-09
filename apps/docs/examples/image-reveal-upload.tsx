"use client"

import { demoAdapter } from "@/examples/_demo"
import { ImageRevealUpload } from "@/registry/default/blocks/image-reveal-upload"

export default function ImageRevealUploadExample() {
  return (
    <div className="w-full max-w-md">
      <ImageRevealUpload adapter={demoAdapter} />
    </div>
  )
}
