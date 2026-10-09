"use client"

import * as React from "react"
import { useUploader } from "@uploadcn/react"

import { demoAdapter, useSampleFiles } from "@/examples/_demo"
import { AnimatedUploadQueue } from "@/registry/default/blocks/animated-upload-queue"
import { AvatarUpload } from "@/registry/default/blocks/avatar-upload"
import { ChatAttachments } from "@/registry/default/blocks/chat-attachments"
import { FolderUpload } from "@/registry/default/blocks/folder-upload"
import { PolaroidUpload } from "@/registry/default/blocks/polaroid-upload"
import { ProgressRingUpload } from "@/registry/default/blocks/progress-ring-upload"
import { UploadDock } from "@/registry/default/blocks/upload-dock"
import { UploadIsland } from "@/registry/default/blocks/upload-island"
import { UploadMorphButton } from "@/registry/default/blocks/upload-morph-button"
import { UploadStack } from "@/registry/default/blocks/upload-stack"
import { UploadTerminal } from "@/registry/default/blocks/upload-terminal"
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
  UploadItemRemove,
  UploadItemTitle,
  UploadList,
  UploadTrigger,
} from "@/registry/default/ui/upload"
import { cn } from "@/lib/utils"

function Card({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "mb-4 break-inside-avoid rounded-2xl border bg-card p-5 text-card-foreground shadow-xs",
        className
      )}
    >
      <p className="mb-4 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </section>
  )
}

function FolderCard() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "documents")
  return (
    <Card label="Folder upload">
      <FolderUpload uploader={uploader} name="Q3 Reports" />
    </Card>
  )
}

function QueueCard() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)
  return (
    <Card label="Composable queue">
      <Upload uploader={uploader}>
        <UploadDropzone size="sm">
          <UploadDropzoneHeader>
            <UploadDropzoneMedia variant="icon" />
            <UploadDropzoneTitle>Drop files here</UploadDropzoneTitle>
            <UploadDropzoneDescription>
              or click to browse
            </UploadDropzoneDescription>
          </UploadDropzoneHeader>
        </UploadDropzone>
        <UploadList>
          <UploadItem size="sm">
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
    </Card>
  )
}

function ChatCard() {
  const [sent, setSent] = React.useState<string[]>([])
  return (
    <Card label="AI chat attachments">
      {sent.length ? (
        <ul className="mb-3 flex flex-col items-end gap-1.5">
          {sent.slice(-2).map((message, index) => (
            <li
              key={index}
              className="max-w-[85%] rounded-2xl bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
            >
              {message}
            </li>
          ))}
        </ul>
      ) : null}
      <ChatAttachments
        adapter={demoAdapter}
        placeholder="Paste a screenshot or attach a PDF…"
        onSend={({ text, attachments }) =>
          setSent((list) => [
            ...list,
            text ||
              `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`,
          ])
        }
      />
    </Card>
  )
}

function ProfileCard() {
  return (
    <Card label="Avatar & buttons">
      <div className="flex flex-col gap-5">
        <AvatarUpload adapter={demoAdapter} />
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <UploadMorphButton adapter={demoAdapter}>Upload</UploadMorphButton>
          <span className="text-xs text-muted-foreground">
            Morphs into its own progress bar
          </span>
        </div>
      </div>
    </Card>
  )
}

function PolaroidCard() {
  const uploader = useUploader({
    adapter: demoAdapter,
    accept: "image/*",
    maxFiles: 8,
  })
  useSampleFiles(uploader, "images")
  return (
    <Card label="Polaroid photos">
      <PolaroidUpload uploader={uploader} />
    </Card>
  )
}

function AnimatedQueueCard() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "documents")
  return (
    <Card label="Animated queue">
      <AnimatedUploadQueue uploader={uploader} />
    </Card>
  )
}

function StackCard() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)
  return (
    <Card label="Upload stack">
      <UploadStack uploader={uploader} />
    </Card>
  )
}

function ChipsCard() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)
  return (
    <Card label="Attachment chips">
      <Upload uploader={uploader}>
        <UploadList variant="inline">
          <UploadItem
            variant="muted"
            size="xs"
            className="w-40 rounded-full pe-1"
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
          + Attach
        </UploadTrigger>
      </Upload>
    </Card>
  )
}

function IslandCard() {
  return (
    <Card label="Upload island">
      <div className="flex min-h-24 items-center justify-center">
        <UploadIsland adapter={demoAdapter} />
      </div>
    </Card>
  )
}

function RingCard() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader, "documents")
  return (
    <Card label="Progress ring">
      <ProgressRingUpload uploader={uploader} />
    </Card>
  )
}

function TerminalCard() {
  const uploader = useUploader({ adapter: demoAdapter })
  useSampleFiles(uploader)
  return (
    <Card label="Upload terminal">
      <UploadTerminal uploader={uploader} title="deploy/assets" />
    </Card>
  )
}

function DockCard() {
  const uploader = useUploader({ adapter: demoAdapter, accept: "image/*" })
  useSampleFiles(uploader, "images")
  return (
    <Card label="Upload dock">
      <UploadDock uploader={uploader} />
    </Card>
  )
}

/** A wall of live components, like the shadcn/ui home page. */
export function Showcase() {
  return (
    <div className="relative">
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
        <FolderCard />
        <IslandCard />
        <ProfileCard />
        <AnimatedQueueCard />
        <TerminalCard />
        <ChatCard />
        <RingCard />
        <QueueCard />
        <DockCard />
        <ChipsCard />
        <PolaroidCard />
        <StackCard />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_bottom,transparent,var(--background))]"
      />
    </div>
  )
}
