"use client"

import { s3Adapter } from "@uploadcn/core"
import { UploadConfigProvider } from "@uploadcn/react"

/**
 * Where every upload in your app goes. Swap the adapter to change storage
 * everywhere at once, see https://uploadcn.dev/docs/storage
 *
 *   cloudinaryAdapter({ cloudName, uploadPreset })  Cloudinary
 *   localAdapter()                                  keep files in the browser
 *   createAdapter(async ({ file }) => …)            your own API or SDK
 */
const adapter = s3Adapter({ endpoint: "/api/upload" })

export function UploadConfig({ children }: { children: React.ReactNode }) {
  return (
    <UploadConfigProvider adapter={adapter} maxSize={50 * 1000 * 1000}>
      {children}
    </UploadConfigProvider>
  )
}
