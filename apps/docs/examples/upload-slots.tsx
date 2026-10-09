"use client"

import { HomeIcon, IdCardIcon } from "lucide-react"

import { Upload, UploadSlot } from "@/registry/default/ui/upload"

export default function UploadSlotsExample() {
  return (
    <Upload className="max-w-md">
      <UploadSlot
        name="id"
        label="Photo ID"
        description="Passport or driver's license"
        accept="image/*,application/pdf"
        icon={<IdCardIcon />}
        required
      />
      <UploadSlot
        name="address"
        label="Proof of address"
        description="Utility bill or bank statement"
        accept="application/pdf,image/*"
        icon={<HomeIcon />}
      />
    </Upload>
  )
}
