"use client"

import { demoAdapter } from "@/examples/_demo"
import { RippleDropzone } from "@/registry/default/blocks/ripple-dropzone"

export default function RippleDropzoneExample() {
  return <RippleDropzone adapter={demoAdapter} />
}
