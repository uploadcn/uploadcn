"use client"

import { demoAdapter } from "@/examples/_demo"
import { UploadPopover } from "@/registry/default/blocks/upload-popover"

export default function UploadPopoverExample() {
  return <UploadPopover adapter={demoAdapter} />
}
