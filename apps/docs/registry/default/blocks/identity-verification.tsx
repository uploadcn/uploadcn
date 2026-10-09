"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { NativeButton, Upload, UploadSlot } from "@/registry/default/ui/upload"

export interface VerificationStep {
  name: string
  label: string
  description?: string
  accept?: string
  icon?: React.ReactNode
}

const DEFAULT_STEPS: VerificationStep[] = [
  {
    name: "id-front",
    label: "ID, front",
    description: "Passport, driver's license or national ID",
    accept: "image/*,application/pdf",
    icon: (
      <IconPlaceholder
        lucide="IdCardIcon"
        tabler="IconId"
        hugeicons="IdIcon"
        phosphor="IdentificationCardIcon"
        remixicon="RiIdCardLine"
      />
    ),
  },
  {
    name: "id-back",
    label: "ID, back",
    description: "Skip for passports",
    accept: "image/*,application/pdf",
    icon: (
      <IconPlaceholder
        lucide="IdCardIcon"
        tabler="IconId"
        hugeicons="IdIcon"
        phosphor="IdentificationCardIcon"
        remixicon="RiIdCardLine"
      />
    ),
  },
  {
    name: "selfie",
    label: "Selfie",
    description: "Face the camera in good light",
    accept: "image/*",
    icon: (
      <IconPlaceholder
        lucide="ScanFaceIcon"
        tabler="IconFaceId"
        hugeicons="FaceIdIcon"
        phosphor="ScanIcon"
        remixicon="RiUserSmileLine"
      />
    ),
  },
]

interface IdentityVerificationProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  steps?: VerificationStep[]
  /** Steps that may be skipped. Default `["id-back"]`. */
  optional?: string[]
  /** Default 15 MB per file. */
  maxSize?: number
  /** Called with each step's uploaded file when the user submits. */
  onSubmit?: (files: Record<string, UploadItemData<TResult>>) => void
  className?: string
}

/**
 * KYC-style identity check: a slot per document, a progress rail, and a
 * submit button that unlocks once every required document is uploaded.
 */
function IdentityVerification<TResult = unknown>({
  adapter,
  uploader,
  steps = DEFAULT_STEPS,
  optional = ["id-back"],
  maxSize = 15 * 1000 * 1000,
  onSubmit,
  className,
}: IdentityVerificationProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, maxSize }) as UploadRootProps<TResult>)}
      className={className}
    >
      <Verification
        steps={steps}
        optional={optional}
        onSubmit={
          onSubmit as
            ((files: Record<string, UploadItemData>) => void) | undefined
        }
      />
    </Upload>
  )
}

function Verification({
  steps,
  optional,
  onSubmit,
}: {
  steps: VerificationStep[]
  optional: string[]
  onSubmit?: (files: Record<string, UploadItemData>) => void
}) {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)
  const bySlot = (name: string) =>
    items.find((item) => item.meta.slot === name && item.status !== "cancelled")
  const done = steps.filter((step) => bySlot(step.name)?.status === "success")
  const ready = steps.every(
    (step) =>
      optional.includes(step.name) || bySlot(step.name)?.status === "success"
  )
  const busy = steps.some((step) => {
    const status = bySlot(step.name)?.status
    return (
      status &&
      status !== "success" &&
      status !== "error" &&
      status !== "rejected"
    )
  })

  return (
    <div className="cn-upload-card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="cn-upload-card-title">Verify your identity</h3>
        <p className="cn-upload-card-description text-muted-foreground">
          We need a photo ID and a selfie. It takes about two minutes.
        </p>
      </div>
      <ol className="flex gap-1.5" aria-label="Progress">
        {steps.map((step) => {
          const status = bySlot(step.name)?.status
          return (
            <li
              key={step.name}
              aria-label={`${step.label}: ${status === "success" ? "done" : (status ?? "not started")}`}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-muted transition-colors",
                status === "success" && "bg-primary",
                (status === "uploading" || status === "queued") &&
                  "animate-pulse bg-primary/50 motion-reduce:animate-none",
                (status === "error" || status === "rejected") &&
                  "bg-destructive"
              )}
            />
          )
        })}
      </ol>
      <div className="flex flex-col gap-2">
        {steps.map((step) => (
          <UploadSlot
            key={step.name}
            name={step.name}
            label={step.label}
            description={
              optional.includes(step.name)
                ? `${step.description ?? ""} · optional`.replace(/^ · /, "")
                : step.description
            }
            accept={step.accept}
            icon={
              bySlot(step.name)?.status === "success" ? (
                <IconPlaceholder
                  lucide="CheckIcon"
                  tabler="IconCheck"
                  hugeicons="Tick02Icon"
                  phosphor="CheckIcon"
                  remixicon="RiCheckLine"
                />
              ) : (
                step.icon
              )
            }
            required={!optional.includes(step.name)}
          />
        ))}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconPlaceholder
            lucide="LockIcon"
            tabler="IconLock"
            hugeicons="SquareLock02Icon"
            phosphor="LockKeyIcon"
            remixicon="RiLockLine"
            className="size-3.5 shrink-0"
          />
          Encrypted in transit and only used for verification.
        </p>
        <NativeButton
          disabled={!ready || busy}
          onClick={() =>
            onSubmit?.(
              Object.fromEntries(
                steps.flatMap((step) => {
                  const item = bySlot(step.name)
                  return item?.status === "success" ? [[step.name, item]] : []
                })
              )
            )
          }
        >
          {busy
            ? "Uploading…"
            : ready
              ? "Submit for review"
              : `${done.length} of ${steps.length - optional.length} required`}
        </NativeButton>
      </div>
    </div>
  )
}

export { IdentityVerification, type IdentityVerificationProps }
