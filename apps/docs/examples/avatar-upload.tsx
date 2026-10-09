"use client"

import { toast } from "sonner"

import { AvatarUpload } from "@/registry/default/blocks/avatar-upload"

export default function AvatarUploadExample() {
  return (
    <AvatarUpload
      onChange={(item) =>
        toast(item ? "Profile photo updated" : "Profile photo removed")
      }
    />
  )
}
