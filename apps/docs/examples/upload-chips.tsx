"use client"

import { useUploader } from "@uploadcn/react"
import { PlusIcon } from "lucide-react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import {
  Upload,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemRemove,
  UploadItemTitle,
  UploadList,
  UploadTrigger,
} from "@/registry/default/ui/upload"

export default function UploadChips() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)

  return (
    <Upload uploader={uploader}>
      <UploadList variant="inline">
        <UploadItem
          variant="muted"
          size="xs"
          className="w-44 rounded-full pe-1"
        >
          <UploadItemMedia className="rounded-full" />
          <UploadItemContent>
            <UploadItemTitle />
          </UploadItemContent>
          <UploadItemActions>
            <UploadItemRemove className="rounded-full" />
          </UploadItemActions>
          <UploadItemProgress className="absolute inset-x-3 bottom-0 h-0.5 w-auto" />
        </UploadItem>
      </UploadList>
      <UploadTrigger variant="ghost" className="self-start rounded-full">
        <PlusIcon data-icon="inline-start" />
        Attach
      </UploadTrigger>
    </Upload>
  )
}
