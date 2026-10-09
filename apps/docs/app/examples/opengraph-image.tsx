import { examples } from "@/examples/meta"
import { ogImage, OG_SIZE } from "@/lib/og"

export const alt = "UploadCN examples"
export const size = OG_SIZE
export const contentType = "image/png"

export default function Image() {
  return ogImage({
    eyebrow: "Examples",
    title: `${examples.length} upload components, live.`,
    description:
      "Dropzones, avatars, galleries, animated uploaders, OCR and forms, every one a file in your project.",
    footer: "uploadcn.dev/examples",
  })
}
