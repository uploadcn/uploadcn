"use client"

import { type FileValidator, s3Adapter } from "@uploadcn/core"

import { demoTransport } from "@/examples/_demo"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

const adapter = s3Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
})

/** Custom rules can be sync or async (e.g. ask your API if the name is taken). */
const noSpacesInName: FileValidator = (file) =>
  file.name.includes(" ") ? "File names can't contain spaces" : null

export default function FileRestrictionsExample() {
  return (
    <Upload
      adapter={adapter}
      accept={["image/png", "image/jpeg"]}
      maxSize={2 * 1000 * 1000}
      maxFiles={3}
      image={{ minWidth: 400, minHeight: 400 }}
      validate={noSpacesInName}
      duplicates="reject"
    >
      <UploadDropzone>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon" />
          <UploadDropzoneTitle>
            PNG or JPEG, at least 400×400px
          </UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Max 2 MB each · up to 3 files · no spaces in names · no duplicates
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
      <UploadQueue />
    </Upload>
  )
}
