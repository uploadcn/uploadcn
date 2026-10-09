"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { UploadField } from "@/registry/default/blocks/upload-field"

const schema = z.object({
  title: z.string().min(1, "Give your submission a title"),
  attachments: z
    .array(z.string())
    .min(1, "Attach at least one file")
    .max(3, "Attach at most 3 files"),
})

type Values = z.infer<typeof schema>

export default function FormUploadExample() {
  const [isUploading, setIsUploading] = React.useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", attachments: [] },
  })

  function onSubmit(values: Values) {
    toast("Submitted", {
      description: (
        <pre className="text-xs break-all whitespace-pre-wrap">
          {JSON.stringify(values, null, 2)}
        </pre>
      ),
    })
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="submission-title">Title</FieldLabel>
              <Input
                {...field}
                id="submission-title"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="attachments"
          control={form.control}
          render={({ field, fieldState }) => (
            <UploadField
              label="Attachments"
              description="Up to 3 files. They upload while you fill in the form."
              required
              maxFiles={3}
              error={fieldState.error?.message}
              onChange={field.onChange}
              onBlur={field.onBlur}
              onUploadingChange={setIsUploading}
            />
          )}
        />
      </FieldGroup>
      <Button type="submit" disabled={isUploading} className="self-start">
        {isUploading ? "Waiting for uploads…" : "Submit"}
      </Button>
    </form>
  )
}
