"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  Upload as UploadPrimitive,
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Upload, UploadItemMedia } from "@/registry/default/ui/upload"

interface UploadDockProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

const BASE = 44
const MAGNIFIED = 72
const RANGE = 140

/**
 * A macOS-style dock of uploaded files. Tiles magnify under the cursor,
 * a dot marks files still uploading, and the dock itself is a drop target.
 */
function UploadDock<TResult = unknown>({
  adapter,
  uploader,
  className,
  ...options
}: UploadDockProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={cn("items-center", className)}
    >
      <Dock />
    </Upload>
  )
}

function Dock() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) =>
    state.items.filter(
      (item) => item.status !== "rejected" && item.status !== "cancelled"
    )
  )
  const mouseX = useMotionValue(Infinity)
  const reduceMotion = useReducedMotion()

  return (
    <UploadPrimitive.Dropzone
      data-slot="upload-dock"
      clickable={false}
      onPointerMove={(event) => {
        if (!reduceMotion) mouseX.set(event.clientX)
      }}
      onPointerLeave={() => mouseX.set(Infinity)}
      className="flex h-22 max-w-full [scrollbar-width:none] items-end gap-2.5 overflow-x-auto rounded-2xl border bg-background/70 px-3 pb-3 shadow-lg backdrop-blur-md transition-colors data-dragging:border-primary data-dragging:bg-muted/70"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <DockTile key={item.id} mouseX={mouseX}>
            <UploadItemContext.Provider value={item}>
              <DockFile item={item} />
            </UploadItemContext.Provider>
          </DockTile>
        ))}
      </AnimatePresence>
      {items.length > 0 ? (
        <span
          aria-hidden
          className="mx-0.5 h-10 w-px shrink-0 self-center bg-border"
        />
      ) : null}
      <DockTile mouseX={mouseX}>
        <UploadPrimitive.Trigger
          aria-label="Add files"
          className="flex size-full items-center justify-center rounded-[28%] border border-dashed bg-muted/50 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="Add01Icon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
            className="size-1/2 max-w-6"
          />
        </UploadPrimitive.Trigger>
      </DockTile>
    </UploadPrimitive.Dropzone>
  )
}

function DockTile({
  mouseX,
  children,
}: {
  mouseX: MotionValue<number>
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const distance = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect()
    return rect ? x - rect.left - rect.width / 2 : Infinity
  })
  const target = useTransform(
    distance,
    [-RANGE, 0, RANGE],
    [BASE, MAGNIFIED, BASE],
    { clamp: true }
  )
  const size = useSpring(target, { mass: 0.1, stiffness: 170, damping: 14 })

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.4, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.4 }}
      style={{ width: size, height: size }}
      className="relative shrink-0"
    >
      {children}
    </motion.div>
  )
}

function DockFile({ item }: { item: UploadItemData }) {
  const active =
    item.status === "uploading" ||
    item.status === "queued" ||
    item.status === "processing" ||
    item.status === "scanning"
  const failed = item.status === "error"

  return (
    <div className="group/dock-file size-full" title={item.name}>
      <UploadItemMedia
        variant="cover"
        className={cn(
          "size-full rounded-[28%] shadow-sm [&_svg]:size-1/2 [&_svg]:max-w-6",
          failed && "ring-2 ring-destructive/60"
        )}
      />
      {active ? (
        <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-background/60 backdrop-blur-sm">
          <motion.span
            className="block h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${item.progress.percent}%` }}
          />
        </span>
      ) : null}
      <span
        aria-hidden
        className={cn(
          "absolute -bottom-2 left-1/2 size-1 -translate-x-1/2 rounded-full",
          active ? "bg-primary" : failed ? "bg-destructive" : "bg-transparent"
        )}
      />
      <span className="pointer-events-none absolute -top-9 left-1/2 max-w-40 -translate-x-1/2 truncate rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/dock-file:opacity-100">
        {item.name}
      </span>
      <span className="sr-only">
        {item.name}, {item.status}
      </span>
    </div>
  )
}

export { UploadDock, type UploadDockProps }
