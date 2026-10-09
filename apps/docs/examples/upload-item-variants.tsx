"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import {
  Upload,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
} from "@/registry/default/ui/upload"

const VARIANTS = ["outline", "muted", "default"] as const

export default function UploadItemVariants() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "documents")

  return (
    <Upload uploader={uploader} className="gap-6">
      {VARIANTS.map((variant) => (
        <section key={variant} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {variant}
          </h3>
          <UploadList>
            <UploadItem variant={variant}>
              <UploadItemMedia />
              <UploadItemContent>
                <UploadItemTitle />
                <UploadItemDescription />
              </UploadItemContent>
              <UploadItemActions />
              <UploadItemProgress />
            </UploadItem>
          </UploadList>
        </section>
      ))}
    </Upload>
  )
}
