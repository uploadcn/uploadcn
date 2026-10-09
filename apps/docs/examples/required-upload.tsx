"use client"

import * as React from "react"
import { s3Adapter, validateFileCount } from "@uploadcn/core"
import { useUploadValue, useUploader } from "@uploadcn/react"

import { demoTransport } from "@/examples/_demo"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

const adapter = s3Adapter({
  endpoint: "/api/upload",
  transport: demoTransport, // docs only, see examples/_demo.ts
})
const getKey = (item: { result?: { key: string } }) => item.result?.key ?? ""

/**
 * A plain <form>: successful uploads are submitted as hidden inputs named
 * "documents", so this works with server actions too.
 */
export default function RequiredUploadExample() {
  const uploader = useUploader({ adapter, maxFiles: 2 })
  const keys = useUploadValue(uploader, getKey)
  const [error, setError] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState<string[] | null>(null)
  const labelId = React.useId()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const issue = validateFileCount(keys.length, { minFiles: 1, maxFiles: 2 })
    setError(issue?.message ?? null)
    if (issue) return
    setSubmitted(
      new FormData(event.currentTarget).getAll("documents").map(String)
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel id={labelId}>
          Proof of identity{" "}
          <span aria-hidden className="text-muted-foreground">
            *
          </span>
        </FieldLabel>
        <Upload uploader={uploader} name="documents">
          <UploadDropzone
            aria-labelledby={labelId}
            aria-required
            aria-invalid={error ? true : undefined}
            className="py-6 aria-invalid:border-destructive"
          >
            <UploadDropzoneTitle>Add 1–2 documents</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              Passport, ID card or driver’s license
            </UploadDropzoneDescription>
          </UploadDropzone>
          <UploadQueue />
        </Upload>
        <FieldDescription>
          Required. Files are encrypted at rest.
        </FieldDescription>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      <Button type="submit" className="self-start">
        Continue
      </Button>
      {submitted ? (
        <p className="text-sm text-muted-foreground">
          Submitted keys:{" "}
          <code className="text-xs">{submitted.join(", ")}</code>
        </p>
      ) : null}
    </form>
  )
}
