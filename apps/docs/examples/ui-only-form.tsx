"use client"

import { localAdapter } from "@uploadcn/core"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

const adapter = localAdapter()

/**
 * No storage at all: files stay in the browser and the form submits them
 * like a regular <input type="file">, e.g. to a server action.
 */
export default function UiOnlyFormExample() {
  return (
    <form
      className="flex w-full max-w-md flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const files = new FormData(event.currentTarget).getAll(
          "attachments"
        ) as File[]
        toast.success(`Form submitted with ${files.length} files`, {
          description: files.map((file) => file.name).join(", "),
        })
      }}
    >
      <Upload adapter={adapter} name="attachments" submit="file">
        <UploadDropzone size="sm">
          <UploadDropzoneTitle>Attach files</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Nothing is uploaded, the form sends the files
          </UploadDropzoneDescription>
        </UploadDropzone>
        <UploadQueue size="sm" variant="muted" />
      </Upload>
      <Button type="submit" className="self-end">
        Submit form
      </Button>
    </form>
  )
}
