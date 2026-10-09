"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type UploadItem,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  shallowArrayEqual,
  useUploadProgress,
  useUploadValue,
  useUploader,
} from "@uploadcn/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
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
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadQueue,
} from "@/registry/default/ui/upload"

function defaultGetValue(item: UploadItem): string {
  const result = item.result as { key?: string; url?: string } | undefined
  return result?.key ?? result?.url ?? item.name
}

interface UploadFieldProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  label: React.ReactNode
  description?: React.ReactNode
  /** Error message from your form library. */
  error?: string
  /** Form field name (also submitted with native forms). */
  name?: string
  /** Called with the values of successful uploads (keys by default). */
  onChange?: (value: string[]) => void
  onBlur?: () => void
  /** Lets the form block submission while files are still uploading. */
  onUploadingChange?: (uploading: boolean) => void
  getValue?: (item: UploadItem<TResult>) => string
  required?: boolean
  disabled?: boolean
  hint?: React.ReactNode
}

/**
 * An upload field for forms (react-hook-form, TanStack Form, server actions).
 * The value is the list of uploaded object keys, not raw files, so the form
 * submits instantly after the uploads finish.
 */
function UploadField<TResult = unknown>({
  adapter,
  label,
  description,
  error,
  name,
  onChange,
  onBlur,
  onUploadingChange,
  getValue = defaultGetValue as (item: UploadItem<TResult>) => string,
  required,
  disabled,
  hint = "Drag & drop or click to browse",
  ...validation
}: UploadFieldProps<TResult>) {
  const labelId = React.useId()
  const descriptionId = React.useId()
  const errorId = React.useId()
  const uploader = useUploader<TResult>({
    adapter,
    ...validation,
  })
  const values = useUploadValue(uploader, getValue)
  const { isUploading } = useUploadProgress(uploader)

  const onChangeRef = React.useRef(onChange)
  const onUploadingChangeRef = React.useRef(onUploadingChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
    onUploadingChangeRef.current = onUploadingChange
  })
  // Only report real changes, even if `getValue` is an inline function.
  const lastValues = React.useRef<string[] | null>(null)
  React.useEffect(() => {
    if (lastValues.current && shallowArrayEqual(lastValues.current, values))
      return
    lastValues.current = values
    onChangeRef.current?.(values)
  }, [values])
  React.useEffect(
    () => onUploadingChangeRef.current?.(isUploading),
    [isUploading]
  )

  const invalid = !!error
  return (
    <Field
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      <FieldLabel id={labelId}>
        {label}
        {required ? (
          <span aria-hidden className="text-muted-foreground">
            *
          </span>
        ) : null}
      </FieldLabel>
      <Upload
        uploader={uploader}
        name={name}
        disabled={disabled}
        multiple={validation.maxFiles !== 1}
      >
        <UploadDropzone
          aria-labelledby={labelId}
          aria-describedby={
            [description ? descriptionId : null, invalid ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          onBlur={onBlur}
          className="py-6 aria-invalid:border-destructive"
        >
          <UploadDropzoneHeader>
            <UploadDropzoneMedia variant="icon">
              <IconPlaceholder
                lucide="UploadIcon"
                tabler="IconUpload"
                hugeicons="Upload01Icon"
                phosphor="UploadSimpleIcon"
                remixicon="RiUploadLine"
              />
            </UploadDropzoneMedia>
            <UploadDropzoneTitle>{hint}</UploadDropzoneTitle>
            {isUploading ? (
              <UploadDropzoneDescription>Uploading…</UploadDropzoneDescription>
            ) : null}
          </UploadDropzoneHeader>
        </UploadDropzone>
        <UploadQueue size="sm" />
      </Upload>
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      {invalid ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  )
}

export { UploadField, type UploadFieldProps }
