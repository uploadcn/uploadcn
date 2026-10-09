"use client"

import { demoAdapter } from "@/examples/_demo"
import { LiquidDropzone } from "@/registry/default/blocks/liquid-dropzone"

export default function LiquidDropzoneExample() {
  return (
    <div className="w-full max-w-md">
      <LiquidDropzone adapter={demoAdapter} />
    </div>
  )
}
