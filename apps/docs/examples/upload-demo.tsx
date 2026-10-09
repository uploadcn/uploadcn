"use client"

import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadItem,
  UploadItemActions,
  UploadItemContent,
  UploadItemDescription,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemTitle,
  UploadList,
} from "@/registry/default/ui/upload"

export default function UploadDemo() {
  const uploader = useUploader({ adapter: demoAdapter, maxFiles: 8 })
  useSampleFiles(uploader)

  return (
    <Upload uploader={uploader}>
      <UploadDropzone>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon" />
          <UploadDropzoneTitle>Drop files here</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            or click to browse · up to 8 files
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <UploadList>
        <UploadItem>
          <UploadItemMedia />
          <UploadItemContent>
            <UploadItemTitle />
            <UploadItemDescription />
          </UploadItemContent>
          <UploadItemActions />
          <UploadItemProgress />
        </UploadItem>
      </UploadList>
    </Upload>
  )
}
