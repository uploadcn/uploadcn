"use client"

import { demoAdapter } from "@/examples/_demo"
import { UploadMorphButton } from "@/registry/default/blocks/upload-morph-button"

export default function UploadMorphButtonExample() {
  return (
    <div className="flex justify-center">
      <UploadMorphButton adapter={demoAdapter}>Upload report</UploadMorphButton>
    </div>
  )
}
