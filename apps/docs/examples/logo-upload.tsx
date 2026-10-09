"use client"

import { demoAdapter } from "@/examples/_demo"
import { LogoUpload } from "@/registry/default/blocks/logo-upload"

export default function LogoUploadExample() {
  return (
    <div className="w-full max-w-lg">
      <LogoUpload adapter={demoAdapter} name="Acme Inc" />
    </div>
  )
}
