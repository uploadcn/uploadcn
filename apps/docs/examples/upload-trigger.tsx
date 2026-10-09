"use client"

import { UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { demoAdapter } from "@/examples/_demo"
import {
  Upload,
  UploadQueue,
  UploadTrigger,
} from "@/registry/default/ui/upload"

export default function UploadTriggerExample() {
  return (
    <Upload adapter={demoAdapter}>
      <div className="flex flex-wrap items-center gap-2">
        <UploadTrigger render={<Button />}>
          <UploadIcon data-icon="inline-start" />
          Upload
        </UploadTrigger>
        <UploadTrigger variant="outline" size="default">
          Choose files
        </UploadTrigger>
        <UploadTrigger render={<Button variant="link" />}>
          or browse your computer
        </UploadTrigger>
      </div>
      <UploadQueue variant="muted" size="sm" />
    </Upload>
  )
}
