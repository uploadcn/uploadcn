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

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Input } from "@/components/ui/input"
import { NativeButton, Upload, UploadSlot } from "@/registry/default/ui/upload"

export interface JobApplication<TResult = unknown> {
  resume: UploadItemData<TResult>
  coverLetter?: UploadItemData<TResult>
  portfolio?: UploadItemData<TResult>
  link?: string
}

interface JobApplicationUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  role?: string
  /** Default 10 MB per file. */
  maxSize?: number
  onSubmit?: (application: JobApplication<TResult>) => void
  className?: string
}

const DOCUMENTS = "application/pdf,.doc,.docx,application/msword"

/**
 * A careers-page application: resume (required), cover letter and
 * portfolio (optional), plus a link. Files upload while the candidate
 * fills in the rest.
 */
function JobApplicationUpload<TResult = unknown>({
  adapter,
  uploader,
  role = "Senior Product Designer",
  maxSize = 10 * 1000 * 1000,
  onSubmit,
  className,
}: JobApplicationUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : { adapter, maxSize }) as UploadRootProps<TResult>)}
      className={className}
    >
      <Application
        role={role}
        onSubmit={
          onSubmit as ((application: JobApplication) => void) | undefined
        }
      />
    </Upload>
  )
}

function Application({
  role,
  onSubmit,
}: {
  role: string
  onSubmit?: (application: JobApplication) => void
}) {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)
  const [link, setLink] = React.useState("")
  const slot = (name: string) =>
    items.find((item) => item.meta.slot === name && item.status === "success")
  const resume = slot("resume")
  const pending = items.some(
    (item) => item.status === "uploading" || item.status === "queued"
  )

  return (
    <form
      className="cn-upload-card flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!resume) return
        onSubmit?.({
          resume,
          coverLetter: slot("cover-letter"),
          portfolio: slot("portfolio"),
          link: link || undefined,
        })
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <IconPlaceholder
            lucide="BriefcaseIcon"
            tabler="IconBriefcase"
            hugeicons="Briefcase01Icon"
            phosphor="BriefcaseIcon"
            remixicon="RiBriefcaseLine"
            className="size-4"
          />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Apply for</span>
          <h3 className="cn-upload-card-title">{role}</h3>
        </div>
      </div>
      <UploadSlot
        name="resume"
        label="Resume"
        description="PDF or Word, up to 10 MB"
        accept={DOCUMENTS}
        icon={
          <IconPlaceholder
            lucide="FileTextIcon"
            tabler="IconFileDescription"
            hugeicons="File01Icon"
            phosphor="FileTextIcon"
            remixicon="RiFileTextLine"
          />
        }
        required
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <UploadSlot
          name="cover-letter"
          label="Cover letter"
          description="Optional"
          accept={DOCUMENTS}
          icon={
            <IconPlaceholder
              lucide="MailIcon"
              tabler="IconMail"
              hugeicons="Mail01Icon"
              phosphor="EnvelopeIcon"
              remixicon="RiMailLine"
            />
          }
        />
        <UploadSlot
          name="portfolio"
          label="Portfolio"
          description="PDF, optional"
          accept="application/pdf"
          icon={
            <IconPlaceholder
              lucide="FileTextIcon"
              tabler="IconFileDescription"
              hugeicons="File01Icon"
              phosphor="FileTextIcon"
              remixicon="RiFileTextLine"
            />
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="application-link" className="text-sm font-medium">
          Website or LinkedIn
        </label>
        <div className="relative">
          <IconPlaceholder
            lucide="LinkIcon"
            tabler="IconLink"
            hugeicons="LinkIcon"
            phosphor="LinkIcon"
            remixicon="RiLinksLine"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="application-link"
            type="url"
            placeholder="https://"
            className="ps-8"
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
        </div>
      </div>
      <NativeButton type="submit" disabled={!resume || pending}>
        {pending
          ? "Uploading…"
          : resume
            ? "Submit application"
            : "Add your resume to apply"}
      </NativeButton>
    </form>
  )
}

export { JobApplicationUpload, type JobApplicationUploadProps }
