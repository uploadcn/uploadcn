"use client"

import type * as React from "react"
import { MiB, mockAdapter } from "@uploadcn/core"
import { Upload, useUploadItem } from "@uploadcn/react"
import { cn } from "cn"
import { PlusIcon, XIcon } from "lucide-react"

const adapter = mockAdapter({ speed: 1.5 * MiB })

/**
 * Built from the headless primitives in @uploadcn/react, no styled
 * components. Behavior, keyboard support and ARIA come for free.
 */
export default function CustomUploadUiExample() {
  return (
    <Upload.Root
      adapter={adapter}
      accept="image/*"
      maxFiles={6}
      className="flex flex-wrap gap-3"
    >
      <Upload.List className="contents">
        {(item) => (
          <Upload.Item key={item.id} item={item} className="contents">
            <Tile />
          </Upload.Item>
        )}
      </Upload.List>
      <Upload.Dropzone
        aria-label="Add photos"
        className="flex size-24 items-center justify-center rounded-full border-2 border-dashed text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-dragging:border-primary data-dragging:text-foreground"
      >
        <PlusIcon className="size-6" />
      </Upload.Dropzone>
    </Upload.Root>
  )
}

function Tile() {
  const item = useUploadItem()
  const done = item.status === "success"
  return (
    <div className="group relative size-24 animate-in zoom-in-90 motion-reduce:animate-none">
      <Upload.Preview className="size-full rounded-full object-cover" />
      <Upload.Progress
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          done && "opacity-0"
        )}
        render={(props, { percent }) => (
          <div
            {...props}
            className={cn(props.className as string, "rounded-full")}
            style={{
              ...(props.style as React.CSSProperties),
              background: `conic-gradient(transparent ${percent}%, color-mix(in oklch, var(--background) 70%, transparent) ${percent}% 100%)`,
            }}
          />
        )}
      />
      <Upload.Remove className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
        <XIcon className="size-3" />
      </Upload.Remove>
    </div>
  )
}
