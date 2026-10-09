"use client"

import { demoAdapter } from "@/examples/_demo"
import { MagneticDropzone } from "@/registry/default/blocks/magnetic-dropzone"

export default function MagneticDropzoneExample() {
  return (
    <div className="w-full max-w-md">
      <MagneticDropzone adapter={demoAdapter} />
    </div>
  )
}
