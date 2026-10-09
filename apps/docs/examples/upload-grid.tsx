"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemStatus,
  UploadList,
} from "@/registry/default/ui/upload"

export default function UploadGrid() {
  const uploader = useUploader({ adapter: demoAdapter, accept: "image/*" })
  useSampleFiles(uploader, "images")

  return (
    <Upload uploader={uploader}>
      <UploadList variant="grid">
        <UploadItem variant="tile">
          <UploadItemMedia variant="cover" />
          <UploadItemActions />
          <UploadItemContent>
            <UploadItemStatus />
            <UploadItemProgress />
          </UploadItemContent>
        </UploadItem>
      </UploadList>
      <UploadDropzone size="sm">
        <UploadDropzoneHeader>
          <UploadDropzoneMedia />
          <UploadDropzoneTitle>Add more photos</UploadDropzoneTitle>
        </UploadDropzoneHeader>
      </UploadDropzone>
    </Upload>
  )
}
