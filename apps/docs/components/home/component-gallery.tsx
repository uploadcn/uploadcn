import type * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

const bar = "rounded-full bg-muted-foreground/25"

function Row({ progress }: { progress?: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-background px-1.5 py-1">
      <span className="size-3 shrink-0 rounded-[3px] bg-muted-foreground/25" />
      <span className="flex flex-1 flex-col gap-1">
        <span className={cn(bar, "h-1 w-3/5")} />
        {progress != null ? (
          <span className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-foreground/70"
              style={{ width: `${progress}%` }}
            />
          </span>
        ) : null}
      </span>
    </div>
  )
}

const THUMBNAILS: Record<string, React.ReactNode> = {
  upload: (
    <div className="flex w-32 flex-col gap-1.5">
      <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-muted-foreground/40">
        <span className="size-3 rounded-full border border-muted-foreground/40" />
      </div>
      <Row progress={70} />
      <Row />
    </div>
  ),
  "folder-upload": (
    <div className="relative h-14 w-20">
      <div className="absolute inset-x-0 bottom-0 h-12 rounded-md rounded-tl-none bg-foreground/50" />
      <div className="absolute top-0 left-0 h-3 w-8 rounded-t-md bg-foreground/50" />
      <div className="absolute inset-x-2 bottom-2 h-10 -rotate-3 rounded-sm bg-background" />
      <div className="absolute inset-x-0 bottom-0 h-8 origin-bottom [transform:perspective(200px)_rotateX(-18deg)] rounded-md bg-foreground/80 transition-transform group-hover:[transform:perspective(200px)_rotateX(-32deg)]" />
    </div>
  ),
  "upload-morph-button": (
    <div className="flex flex-col items-center gap-2">
      <span className="flex h-6 w-20 items-center justify-center rounded-full bg-foreground/80">
        <span className="h-1 w-8 rounded-full bg-background/80" />
      </span>
      <span className="relative h-6 w-24 overflow-hidden rounded-full bg-foreground/80">
        <span className="absolute inset-y-0 left-0 w-3/5 bg-background/25" />
      </span>
    </div>
  ),
  "image-upload": (
    <div className="grid w-28 grid-cols-3 gap-1">
      {[
        "bg-foreground/60",
        "bg-muted-foreground/40",
        "bg-foreground/30",
        "bg-muted-foreground/30",
        "bg-foreground/50",
        "border border-dashed border-muted-foreground/40",
      ].map((tone, index) => (
        <span key={index} className={cn("aspect-square rounded-sm", tone)} />
      ))}
    </div>
  ),
  "avatar-upload": (
    <div className="flex items-center gap-2">
      <span className="relative size-12 rounded-full border-2 border-foreground/70 p-0.5">
        <span className="block size-full rounded-full bg-muted-foreground/30" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="h-4 w-14 rounded-md border bg-background" />
        <span className={cn(bar, "h-1 w-12")} />
      </span>
    </div>
  ),
  "chat-attachments": (
    <div className="flex w-36 flex-col gap-1.5 rounded-lg border bg-background p-1.5">
      <div className="flex gap-1">
        <span className="h-4 w-12 rounded-md bg-muted" />
        <span className="h-4 w-10 rounded-md bg-muted" />
      </div>
      <span className={cn(bar, "h-1 w-24")} />
      <div className="flex justify-between">
        <span className="size-3 rounded-sm bg-muted" />
        <span className="size-3 rounded-full bg-foreground/80" />
      </div>
    </div>
  ),
  "document-ingest": (
    <div className="flex w-36 flex-wrap gap-1">
      {["Parse", "Chunk", "Embed", "Index"].map((stage, index) => (
        <span
          key={stage}
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[0.55rem]",
            index < 2
              ? "border-transparent bg-foreground/80 text-background"
              : "text-muted-foreground"
          )}
        >
          {stage}
        </span>
      ))}
    </div>
  ),
  "animated-upload-queue": (
    <div className="flex w-32 flex-col gap-1.5">
      <Row progress={100} />
      <Row progress={45} />
      <Row progress={10} />
    </div>
  ),
  "upload-stack": (
    <div className="relative h-14 w-32">
      <span className="absolute inset-x-4 top-4 h-8 rounded-md border bg-background/60" />
      <span className="absolute inset-x-2 top-2 h-8 rounded-md border bg-background/80" />
      <span className="absolute inset-x-0 top-0 h-8 rounded-md border bg-background shadow-sm" />
    </div>
  ),
  "polaroid-upload": (
    <div className="flex">
      {["-rotate-6", "rotate-3", "-rotate-2"].map((rotation, index) => (
        <span
          key={rotation}
          className={cn(
            "-ms-2 flex w-11 flex-col gap-1 rounded-[2px] border bg-background p-1 pb-2 shadow-sm transition-transform group-hover:rotate-0",
            rotation
          )}
        >
          <span
            className={cn(
              "aspect-square rounded-[1px]",
              index === 1 ? "bg-foreground/50" : "bg-muted-foreground/35"
            )}
          />
        </span>
      ))}
    </div>
  ),
  "video-upload": (
    <div className="flex w-32 flex-col gap-1">
      <span className="flex aspect-video items-center justify-center rounded-md bg-foreground/70">
        <span className="size-0 border-y-4 border-s-6 border-y-transparent border-s-background" />
      </span>
      <span className={cn(bar, "h-1 w-full")} />
    </div>
  ),
  "upload-field": (
    <div className="flex w-32 flex-col gap-1.5">
      <span className={cn(bar, "h-1.5 w-12 bg-foreground/50")} />
      <span className="h-8 rounded-md border border-dashed border-muted-foreground/40" />
      <span className={cn(bar, "h-1 w-20")} />
    </div>
  ),
  "upload-island": (
    <div className="flex flex-col items-center gap-2">
      <span className="flex h-6 w-16 items-center justify-center gap-1 rounded-full bg-foreground/85">
        <span className="h-1 w-6 rounded-full bg-background/70" />
      </span>
      <span className="flex h-7 w-28 items-center gap-1.5 rounded-full bg-foreground/85 px-1.5 transition-[width] duration-300 group-hover:w-32">
        <span className="size-4 rounded-full border-2 border-background/30 border-t-background" />
        <span className="h-1 flex-1 rounded-full bg-background/60" />
      </span>
    </div>
  ),
  "progress-ring-upload": (
    <svg viewBox="0 0 48 48" className="size-16 -rotate-90" aria-hidden>
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        strokeWidth="4"
        className="stroke-muted-foreground/20"
      />
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="125.6"
        strokeDashoffset="40"
        className="stroke-foreground/80 transition-[stroke-dashoffset] duration-700 group-hover:[stroke-dashoffset:0]"
      />
    </svg>
  ),
  "upload-terminal": (
    <div className="flex w-36 flex-col gap-1 rounded-md bg-zinc-950 p-2 font-mono text-[0.5rem] leading-none text-zinc-400">
      <span className="flex gap-0.5 pb-1">
        <span className="size-1 rounded-full bg-zinc-700" />
        <span className="size-1 rounded-full bg-zinc-700" />
        <span className="size-1 rounded-full bg-zinc-700" />
      </span>
      <span>
        › deck.pdf <span className="text-emerald-400">✓</span>
      </span>
      <span>
        › data.csv <span className="text-emerald-400">████░░</span>
      </span>
      <span className="text-emerald-400">
        $ <span className="inline-block h-2 w-1 bg-zinc-300 align-middle" />
      </span>
    </div>
  ),
  "upload-dock": (
    <div className="flex items-end gap-1 rounded-lg border bg-background/80 p-1.5 shadow-sm">
      {[4, 5, 7, 5, 4].map((size, index) => (
        <span
          key={index}
          className={cn(
            "rounded-[28%]",
            index === 2 ? "bg-foreground/70" : "bg-muted-foreground/35"
          )}
          style={{ width: size * 4, height: size * 4 }}
        />
      ))}
    </div>
  ),
  "liquid-dropzone": (
    <div className="relative h-14 w-28 overflow-hidden rounded-md border border-dashed border-muted-foreground/40">
      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-foreground/15 transition-[height] duration-700 group-hover:h-4/5" />
    </div>
  ),
  "upload-dialog": (
    <div className="flex w-32 flex-col gap-1.5 rounded-lg border bg-background p-2 shadow-md">
      <span className={cn(bar, "h-1.5 w-14 bg-foreground/50")} />
      <span className="h-6 rounded-md border border-dashed border-muted-foreground/40" />
      <span className="flex justify-end gap-1">
        <span className="h-3 w-7 rounded-sm border" />
        <span className="h-3 w-9 rounded-sm bg-foreground/80" />
      </span>
    </div>
  ),
  "upload-table": (
    <div className="flex w-36 flex-col overflow-hidden rounded-md border bg-background">
      {[100, 60, 20].map((progress, index) => (
        <span
          key={index}
          className="flex items-center gap-1.5 border-b px-1.5 py-1 last:border-0"
        >
          <span className="size-2.5 rounded-[2px] bg-muted-foreground/30" />
          <span className={cn(bar, "h-1 w-10")} />
          <span className="ms-auto h-0.5 w-8 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full bg-foreground/70"
              style={{ width: progress + "%" }}
            />
          </span>
        </span>
      ))}
    </div>
  ),
  "logo-upload": (
    <div className="flex gap-1.5 rounded-lg bg-muted p-1.5">
      <span className="flex size-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-[0.6rem] font-semibold text-zinc-900">
        AC
      </span>
      <span className="flex size-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-[0.6rem] font-semibold text-zinc-100">
        AC
      </span>
    </div>
  ),
  "product-media-upload": (
    <div className="grid w-32 grid-cols-3 grid-rows-2 gap-1">
      <span className="col-span-2 row-span-2 rounded-md bg-foreground/60" />
      <span className="aspect-square rounded-sm bg-muted-foreground/35" />
      <span className="aspect-square rounded-sm border border-dashed border-muted-foreground/40" />
    </div>
  ),
  "identity-verification": (
    <div className="flex w-32 flex-col gap-1.5">
      <div className="flex gap-1">
        <span className="h-1 flex-1 rounded-full bg-foreground/70" />
        <span className="h-1 flex-1 rounded-full bg-foreground/70" />
        <span className="h-1 flex-1 rounded-full bg-muted-foreground/25" />
      </div>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="flex items-center gap-1.5 rounded-md border border-dashed bg-background px-1.5 py-1"
        >
          <span className="h-2.5 w-3.5 rounded-[2px] bg-muted-foreground/30" />
          <span className={cn(bar, "h-1 w-12")} />
        </span>
      ))}
    </div>
  ),
  "csv-import": (
    <div className="flex w-36 flex-col overflow-hidden rounded-md border bg-background text-[0.5rem]">
      <span className="grid grid-cols-3 border-b bg-muted px-1.5 py-1 font-medium">
        <span>SKU</span>
        <span>Title</span>
        <span>Price</span>
      </span>
      {["A-1", "A-2", "A-3"].map((sku) => (
        <span
          key={sku}
          className="grid grid-cols-3 px-1.5 py-0.5 text-muted-foreground"
        >
          <span>{sku}</span>
          <span className={cn(bar, "my-auto h-1 w-6")} />
          <span className={cn(bar, "my-auto h-1 w-4")} />
        </span>
      ))}
    </div>
  ),
  "document-checklist": (
    <div className="flex w-32 flex-col gap-1.5">
      {[true, true, false].map((done, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2.5 rounded-full border",
              done
                ? "border-transparent bg-foreground/70"
                : "border-muted-foreground/50"
            )}
          />
          <span className="h-4 flex-1 rounded-md border border-dashed bg-background" />
        </span>
      ))}
    </div>
  ),
}

const ITEMS = [
  { slug: "upload", title: "Upload", description: "The composable parts" },
  {
    slug: "folder-upload",
    title: "Folder Upload",
    description: "Opens as you drag",
    animated: true,
  },
  {
    slug: "upload-morph-button",
    title: "Morphing Button",
    description: "Button → progress → done",
    animated: true,
  },
  {
    slug: "image-upload",
    title: "Image Upload",
    description: "Crop and compress",
  },
  {
    slug: "avatar-upload",
    title: "Avatar Upload",
    description: "Round crop, progress ring",
  },
  {
    slug: "chat-attachments",
    title: "Chat Attachments",
    description: "Paste, drop, send",
  },
  {
    slug: "document-ingest",
    title: "Document Ingest",
    description: "RAG pipelines",
  },
  {
    slug: "animated-upload-queue",
    title: "Animated Queue",
    description: "Rows in motion",
    animated: true,
  },
  {
    slug: "upload-stack",
    title: "Upload Stack",
    description: "Fans out on hover",
    animated: true,
  },
  {
    slug: "polaroid-upload",
    title: "Polaroid Upload",
    description: "Photos with a spring",
    animated: true,
  },
  {
    slug: "video-upload",
    title: "Video Upload",
    description: "Resumable, with playback",
  },
  {
    slug: "upload-field",
    title: "Upload Field",
    description: "Forms and server actions",
  },
  {
    slug: "upload-island",
    title: "Upload Island",
    description: "A pill that morphs",
    animated: true,
  },
  {
    slug: "upload-dialog",
    title: "Upload Dialog",
    description: "Pick, review, upload",
  },
  {
    slug: "progress-ring-upload",
    title: "Progress Ring",
    description: "One ring for the batch",
    animated: true,
  },
  {
    slug: "upload-table",
    title: "Upload Table",
    description: "The queue as a data table",
  },
  {
    slug: "upload-terminal",
    title: "Upload Terminal",
    description: "Uploads as a CLI log",
    animated: true,
  },
  {
    slug: "logo-upload",
    title: "Logo Upload",
    description: "Light and dark previews",
  },
  {
    slug: "upload-dock",
    title: "Upload Dock",
    description: "Magnifies under the cursor",
    animated: true,
  },
  {
    slug: "liquid-dropzone",
    title: "Liquid Dropzone",
    description: "Fills up as it uploads",
    animated: true,
  },
  {
    slug: "product-media-upload",
    title: "Product Media",
    description: "Storefront cover and gallery",
  },
  {
    slug: "identity-verification",
    title: "Identity Verification",
    description: "KYC: ID and selfie",
  },
  {
    slug: "csv-import",
    title: "CSV Import",
    description: "Check columns, then import",
  },
  {
    slug: "document-checklist",
    title: "Document Checklist",
    description: "Claims and onboarding",
  },
]

export function ComponentGallery() {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <li key={item.slug}>
          <Link
            href={`/docs/components/${item.slug}`}
            className="group flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border bg-muted/50 transition-colors group-hover:bg-muted">
              {THUMBNAILS[item.slug]}
              {item.animated ? (
                <span className="absolute top-2 right-2 rounded-full border bg-background px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
                  Animated
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 px-0.5">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">
                {item.description}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
