"use client"

import * as React from "react"
import {
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Upload,
  UploadDropzone,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemRemove,
  UploadItemStatus,
  UploadTrigger,
} from "@/registry/default/ui/upload"

interface LogoUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Shown in the placeholder. Default `"Acme"`. */
  name?: string
  title?: string
  description?: string
  /** Default 2 MB. */
  maxSize?: number
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A settings card for a workspace or company logo, with a live preview
 * on light and dark backgrounds.
 */
function LogoUpload<TResult = unknown>({
  adapter,
  uploader,
  name = "Acme",
  title = "Logo",
  description = "Shown in the sidebar, emails and invoices.",
  maxSize = 2 * 1000 * 1000,
  onSuccess,
  className,
}: LogoUploadProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/png,image/svg+xml,image/webp,image/jpeg",
            maxFiles: 1,
            maxSize,
            onSuccess,
          }) as UploadRootProps<TResult>)}
      multiple={false}
      className={className}
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <LogoBody name={name} />
        <CardFooter className="border-t text-xs text-muted-foreground">
          Square SVG or PNG, at least 256 × 256 px. Max {maxSize / 1000 / 1000}{" "}
          MB.
        </CardFooter>
      </Card>
    </Upload>
  )
}

function Placeholder({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-full items-center justify-center text-lg font-semibold",
        className
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function LogoBody({ name }: { name: string }) {
  const { uploader } = useUploadContext()
  const item = useUploadSelector(uploader, (state) =>
    state.items.find((entry) => entry.status !== "rejected")
  )
  const rejected = useUploadSelector(uploader, (state) =>
    state.items.find((entry) => entry.status === "rejected")
  )

  const preview = (tone: "light" | "dark") => (
    <div
      className={cn(
        "flex size-16 items-center justify-center overflow-hidden rounded-xl border p-2.5",
        tone === "light"
          ? "bg-card text-card-foreground"
          : "border-transparent bg-foreground text-background"
      )}
    >
      {item ? (
        <UploadItemMedia className="size-full border-0 bg-transparent [&_img]:object-contain" />
      ) : (
        <Placeholder name={name} />
      )}
    </div>
  )

  return (
    <UploadItemContext.Provider value={item ?? null}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <UploadDropzone
          variant="muted"
          size="sm"
          aria-label="Logo preview. Drop an image or click to choose one"
          className="w-auto shrink-0 flex-row gap-2 p-2"
        >
          {preview("light")}
          {preview("dark")}
        </UploadDropzone>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {item ? (
            <>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {item.name}
                </span>
                <UploadItemStatus />
              </div>
              <UploadItemProgress />
            </>
          ) : (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                rejected && "text-destructive"
              )}
            >
              {rejected?.issues[0]?.message ??
                "Drop a file on the preview, or choose one."}
            </p>
          )}
          <div className="flex gap-2">
            <UploadTrigger variant="outline" size="sm">
              {item ? "Replace" : "Upload logo"}
            </UploadTrigger>
            {item ? (
              <UploadItemRemove variant="ghost" size="sm">
                Remove
              </UploadItemRemove>
            ) : null}
          </div>
        </div>
      </CardContent>
    </UploadItemContext.Provider>
  )
}

export { LogoUpload, type LogoUploadProps }
