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

const SIZES = ["default", "sm", "xs"] as const

export default function UploadItemSizes() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)

  return (
    <Upload uploader={uploader} className="gap-6">
      {SIZES.map((size) => (
        <section key={size} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">{size}</h3>
          <UploadList>
            <UploadItem size={size}>
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
