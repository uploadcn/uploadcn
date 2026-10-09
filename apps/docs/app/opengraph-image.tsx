import { ogImage, OG_SIZE } from "@/lib/og"
import { siteConfig } from "@/lib/site"

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`
export const size = OG_SIZE
export const contentType = "image/png"

export default function Image() {
  return ogImage({
    eyebrow: "uploadcn.dev",
    title: "File uploads, built for shadcn.",
    description:
      "Upload components with a tested engine underneath: queues, retries, resumable transfers, any storage, virus scanning and OCR.",
    footer: "npx shadcn@latest add @uploadcn/file-upload",
  })
}
