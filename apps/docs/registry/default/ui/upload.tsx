"use client"

import * as React from "react"
import {
  formatBytes,
  formatDuration,
  formatSpeed,
  matchesAccept,
  toAcceptAttribute,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  getPreviewKind,
  getStatusLabel,
  Upload as UploadPrimitive,
  UploadItemContext,
  useDropzone,
  useUploadContext,
  useUploadItem,
  useUploadProgress,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import { buttonVariants } from "@/components/ui/button"

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariantProps = VariantProps<typeof buttonVariants>

/**
 * A native `<button>` with your design system's button styles. Used instead
 * of `<Button>` so every part behaves the same on Radix, Base UI and React
 * Aria (whose Button takes `isDisabled`/`onPress` instead of DOM props).
 */
function NativeButton({
  variant,
  size,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & ButtonVariantProps) {
  return (
    <button
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

function Upload<TResult = unknown>({
  className,
  ...props
}: UploadRootProps<TResult>) {
  return (
    <UploadPrimitive.Root
      data-slot="upload"
      className={cn("flex w-full min-w-0 flex-col gap-3", className)}
      {...(props as UploadRootProps<TResult>)}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Dropzone                                                                   */
/* -------------------------------------------------------------------------- */

const uploadDropzoneVariants = cva(
  [
    "cn-upload-dropzone group/upload-dropzone relative flex w-full min-w-0 text-balance outline-none select-none",
    "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
    "focus-visible:ring-3 focus-visible:ring-ring/50 [&[role=button]]:cursor-pointer",
    "data-disabled:pointer-events-none data-disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default:
          "border border-dashed border-input hover:border-ring/70 hover:bg-muted/40 data-drag-reject:border-destructive data-drag-reject:bg-destructive/5 data-dragging:border-primary data-dragging:bg-muted/60",
        muted:
          "bg-muted/60 hover:bg-muted data-drag-reject:bg-destructive/10 data-drag-reject:ring-destructive/30 data-dragging:bg-muted data-dragging:ring-2 data-dragging:ring-primary/30",
        outline:
          "border bg-card shadow-xs hover:bg-muted/30 data-drag-reject:border-destructive data-dragging:border-primary data-dragging:bg-muted/40",
      },
      orientation: {
        vertical: "flex-col items-center justify-center text-center",
        horizontal:
          "flex-row items-center justify-between text-left max-sm:flex-col max-sm:text-center",
      },
      size: {
        sm: "cn-upload-dropzone-size-sm",
        default: "cn-upload-dropzone-size-default",
        lg: "cn-upload-dropzone-size-lg",
      },
    },
    compoundVariants: [
      { orientation: "horizontal", size: "default", className: "py-5" },
      { orientation: "horizontal", size: "lg", className: "py-8" },
    ],
    defaultVariants: {
      variant: "default",
      orientation: "vertical",
      size: "default",
    },
  }
)

function UploadDropzone({
  className,
  variant = "default",
  orientation = "vertical",
  size = "default",
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Dropzone> &
  VariantProps<typeof uploadDropzoneVariants>) {
  return (
    <UploadPrimitive.Dropzone
      data-slot="upload-dropzone"
      data-variant={variant}
      data-orientation={orientation}
      className={cn(
        uploadDropzoneVariants({ variant, orientation, size }),
        className
      )}
      {...props}
    />
  )
}

function UploadDropzoneHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-dropzone-header"
      className={cn(
        "flex max-w-sm min-w-0 flex-col items-center gap-1.5 group-data-[orientation=horizontal]/upload-dropzone:flex-row group-data-[orientation=horizontal]/upload-dropzone:gap-4 max-sm:group-data-[orientation=horizontal]/upload-dropzone:flex-col",
        className
      )}
      {...props}
    />
  )
}

const uploadDropzoneMediaVariants = cva(
  "flex shrink-0 items-center justify-center transition-transform duration-300 ease-out motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-muted-foreground group-data-dragging/upload-dropzone:-translate-y-1 [&_svg:not([class*='size-'])]:size-6",
        icon: "cn-upload-dropzone-media-icon mb-1.5 group-hover/upload-dropzone:-translate-y-0.5 group-hover/upload-dropzone:text-foreground group-data-drag-reject/upload-dropzone:text-destructive group-data-dragging/upload-dropzone:-translate-y-1 group-data-dragging/upload-dropzone:scale-110 group-data-dragging/upload-dropzone:text-foreground group-data-[orientation=horizontal]/upload-dropzone:mb-0 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function UploadDropzoneMedia({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof uploadDropzoneMediaVariants>) {
  return (
    <div
      data-slot="upload-dropzone-media"
      data-variant={variant}
      aria-hidden
      className={cn(uploadDropzoneMediaVariants({ variant }), className)}
      {...props}
    >
      {children ?? (
        <IconPlaceholder
          lucide="UploadIcon"
          tabler="IconUpload"
          hugeicons="Upload01Icon"
          phosphor="UploadSimpleIcon"
          remixicon="RiUploadLine"
        />
      )}
    </div>
  )
}

function UploadDropzoneTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-dropzone-title"
      className={cn("cn-upload-dropzone-title", className)}
      {...props}
    />
  )
}

function UploadDropzoneDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="upload-dropzone-description"
      className={cn(
        "cn-upload-dropzone-description text-muted-foreground group-data-drag-reject/upload-dropzone:text-destructive [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function UploadDropzoneContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-dropzone-content"
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-center gap-2",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Trigger                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Opens the file picker. Renders an outline button by default; pass
 * `render` to use any element, e.g. `render={<a className="underline" />}`.
 */
function UploadTrigger({
  variant = "outline",
  size = "sm",
  className,
  render,
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Trigger> & ButtonVariantProps) {
  return (
    <UploadPrimitive.Trigger
      data-slot="upload-trigger"
      render={
        render ?? (
          <NativeButton variant={variant} size={size} className={className} />
        )
      }
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* List & items                                                               */
/* -------------------------------------------------------------------------- */

const uploadListVariants = cva(
  "w-full min-w-0 *:animate-in *:duration-200 *:fade-in-0 *:slide-in-from-bottom-1 data-empty:hidden motion-reduce:*:animate-none",
  {
    variants: {
      variant: {
        list: "flex flex-col gap-2",
        grid: "grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2",
        inline: "flex flex-wrap gap-2",
      },
    },
    defaultVariants: { variant: "list" },
  }
)

function UploadList({
  className,
  variant = "list",
  ...props
}: React.ComponentProps<typeof UploadPrimitive.List> &
  VariantProps<typeof uploadListVariants>) {
  return (
    <UploadPrimitive.List
      data-slot="upload-list"
      data-variant={variant}
      className={cn(uploadListVariants({ variant }), className)}
      {...props}
    />
  )
}

const uploadItemVariants = cva(
  [
    "cn-upload-item group/upload-item relative flex min-w-0 outline-none",
    "transition-[background-color,border-color] duration-150",
  ],
  {
    variants: {
      variant: {
        default: "border border-transparent",
        outline:
          "border bg-card text-card-foreground data-[status=error]:border-destructive/40 data-[status=rejected]:border-destructive/40",
        muted:
          "border border-transparent bg-muted/50 data-[status=error]:bg-destructive/5 data-[status=rejected]:bg-destructive/5",
        tile: "aspect-square flex-col justify-end overflow-hidden border bg-muted data-[status=error]:border-destructive/50 data-[status=rejected]:border-destructive/50",
      },
      size: {
        default: "cn-upload-item-size-default",
        sm: "cn-upload-item-size-sm",
        xs: "cn-upload-item-size-xs",
      },
    },
    compoundVariants: [{ variant: "tile", className: "gap-0 p-0" }],
    defaultVariants: { variant: "outline", size: "default" },
  }
)

function UploadItem({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Item> &
  VariantProps<typeof uploadItemVariants>) {
  return (
    <UploadPrimitive.Item
      data-slot="upload-item"
      data-variant={variant}
      data-size={size}
      className={cn(
        uploadItemVariants({ variant, size }),
        variant !== "tile" && "flex-wrap items-center",
        className
      )}
      {...props}
    />
  )
}

type FileKind =
  "image" | "video" | "audio" | "document" | "spreadsheet" | "archive" | "file"

function getFileKind(file: { type: string; name: string }): FileKind {
  const kind = getPreviewKind(file)
  if (kind === "image" || kind === "video" || kind === "audio") return kind
  if (kind === "pdf" || file.type.startsWith("text/")) return "document"
  if (/sheet|excel|csv/.test(file.type)) return "spreadsheet"
  if (/zip|compressed|tar|rar|7z/.test(file.type)) return "archive"
  return "file"
}

/**
 * A loading indicator that looks like shadcn's Spinner. Its props leave out
 * `children` and `strokeWidth`, which some icon libraries type differently
 * (Hugeicons, Remix Icon), so it type-checks with every icon library.
 * See https://github.com/shadcn-ui/ui/issues/9163
 */
function UploadSpinner({
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children" | "strokeWidth">) {
  return (
    <IconPlaceholder
      lucide="Loader2Icon"
      tabler="IconLoader"
      hugeicons="Loading03Icon"
      phosphor="SpinnerIcon"
      remixicon="RiLoaderLine"
      data-slot="upload-spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

/**
 * The icon for the current item's file type. Only `className` is passed on,
 * so the component fits every icon library's prop types.
 */
function UploadFileIcon({ className }: { className?: string }) {
  const item = useUploadItem()
  const iconProps = {
    "data-slot": "upload-file-icon",
    "aria-hidden": true,
    className,
  }
  switch (getFileKind(item.file)) {
    case "image":
      return (
        <IconPlaceholder
          lucide="ImageIcon"
          tabler="IconPhoto"
          hugeicons="Image01Icon"
          phosphor="ImageIcon"
          remixicon="RiImageLine"
          {...iconProps}
        />
      )
    case "video":
      return (
        <IconPlaceholder
          lucide="VideoIcon"
          tabler="IconVideoPlus"
          hugeicons="RecordIcon"
          phosphor="VideoIcon"
          remixicon="RiVideoLine"
          {...iconProps}
        />
      )
    case "audio":
      return (
        <IconPlaceholder
          lucide="MusicIcon"
          tabler="IconMusic"
          hugeicons="MusicNote01Icon"
          phosphor="MusicNoteIcon"
          remixicon="RiMusic2Line"
          {...iconProps}
        />
      )
    case "document":
      return (
        <IconPlaceholder
          lucide="FileTextIcon"
          tabler="IconFileDescription"
          hugeicons="File01Icon"
          phosphor="FileTextIcon"
          remixicon="RiFileTextLine"
          {...iconProps}
        />
      )
    case "spreadsheet":
      return (
        <IconPlaceholder
          lucide="FileSpreadsheetIcon"
          tabler="IconFileSpreadsheet"
          hugeicons="Xls01Icon"
          phosphor="FileXlsIcon"
          remixicon="RiFileExcel2Line"
          {...iconProps}
        />
      )
    case "archive":
      return (
        <IconPlaceholder
          lucide="FileArchiveIcon"
          tabler="IconFileZip"
          hugeicons="File01Icon"
          phosphor="FileZipIcon"
          remixicon="RiFileZipLine"
          {...iconProps}
        />
      )
    default:
      return (
        <IconPlaceholder
          lucide="FileIcon"
          tabler="IconFileWord"
          hugeicons="File01Icon"
          phosphor="FileIcon"
          remixicon="RiFileLine"
          {...iconProps}
        />
      )
  }
}

const uploadItemMediaVariants = cva(
  "relative flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "cn-upload-item-media border bg-muted",
        icon: "cn-upload-item-media size-8 border bg-muted group-data-[size=xs]/upload-item:size-6",
        cover: "absolute inset-0 size-full overflow-hidden bg-muted",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

/**
 * The item's media. `default` shows an image thumbnail when possible and a
 * file-type icon otherwise; `icon` always shows the icon; `cover` fills the
 * item (for `tile` items).
 */
function UploadItemMedia({
  className,
  variant = "default",
  thumbnailSize,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof uploadItemMediaVariants> & { thumbnailSize?: number }) {
  return (
    <div
      data-slot="upload-item-media"
      data-variant={variant}
      className={cn(uploadItemMediaVariants({ variant }), className)}
      {...props}
    >
      {children ??
        (variant === "icon" ? (
          <UploadFileIcon />
        ) : (
          <UploadPrimitive.Preview
            thumbnailSize={thumbnailSize ?? (variant === "cover" ? 400 : 128)}
            fallback={<UploadFileIcon />}
            className="size-full animate-in rounded-[inherit] object-cover duration-300 fade-in-0 motion-reduce:animate-none"
          />
        ))}
      {variant === "cover" ? null : <UploadItemMediaBadge />}
    </div>
  )
}

/** A small check or alert on the media corner once the file settles. */
function UploadItemMediaBadge() {
  const item = useUploadItem()
  const failed = item.status === "error" || item.status === "rejected"
  if (item.status !== "success" && !failed) return null
  return (
    <span
      aria-hidden
      data-slot="upload-item-media-badge"
      className={cn(
        "absolute -right-1 -bottom-1 flex size-4 animate-in items-center justify-center rounded-full ring-2 ring-card duration-300 zoom-in-50 motion-reduce:animate-none [&_svg]:!size-4",
        failed
          ? "bg-destructive text-white"
          : "bg-primary text-primary-foreground"
      )}
    >
      {failed ? (
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconExclamationCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
          strokeWidth={2.5}
        />
      ) : (
        <IconPlaceholder
          lucide="CircleCheckIcon"
          tabler="IconCircleCheckFilled"
          hugeicons="CheckmarkCircle01Icon"
          phosphor="CheckCircleIcon"
          remixicon="RiCheckboxCircleFill"
          strokeWidth={2.5}
        />
      )}
    </span>
  )
}

function UploadItemContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-item-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 group-data-[variant=tile]/upload-item:relative group-data-[variant=tile]/upload-item:flex-none group-data-[variant=tile]/upload-item:bg-background/85 group-data-[variant=tile]/upload-item:p-2 group-data-[variant=tile]/upload-item:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

/** The file name, unless you pass children. */
function UploadItemTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const item = useUploadItem()
  return (
    <div
      data-slot="upload-item-title"
      title={typeof children === "string" ? children : item.name}
      className={cn(
        "cn-upload-item-title min-w-0 truncate group-data-[variant=tile]/upload-item:text-xs",
        className
      )}
      {...props}
    >
      {children ?? item.name}
    </div>
  )
}

function describeItem(
  item: UploadItemData,
  statusLabel: string
): React.ReactNode {
  if (item.status === "error" || item.status === "rejected") {
    return item.issues[0]?.message ?? item.error?.message ?? statusLabel
  }
  if (item.status === "uploading" || item.status === "paused") {
    const parts = [
      `${formatBytes(item.progress.loaded)} of ${formatBytes(item.size)}`,
      item.status === "paused"
        ? statusLabel
        : `${Math.round(item.progress.percent)}%`,
    ]
    if (item.status === "uploading" && item.progress.speed) {
      parts.push(formatSpeed(item.progress.speed))
      const eta = formatDuration(item.progress.eta)
      if (eta) parts.push(`${eta} left`)
    }
    return parts.join(" · ")
  }
  return `${formatBytes(item.size)} · ${statusLabel}`
}

/**
 * Size and status by default, "4.2 MB of 9.8 MB · 43% · 1.2 MB/s · 4s left"
 * while uploading, the reason when failed. Pass children to customize.
 */
function UploadItemDescription({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const item = useUploadItem()
  const { messages } = useUploadContext()
  return (
    <p
      data-slot="upload-item-description"
      data-status={item.status}
      className={cn(
        "cn-upload-item-description line-clamp-2 text-muted-foreground tabular-nums data-[status=error]:text-destructive data-[status=rejected]:text-destructive",
        className
      )}
      {...props}
    >
      {children ?? describeItem(item, getStatusLabel(item, messages) ?? "")}
    </p>
  )
}

/** The status icon. Each icon is a placeholder the shadcn CLI resolves to
 * your project's icon library on install. */
function StatusIcon({
  status,
  className,
}: {
  status: UploadItemData["status"]
  className?: string
}) {
  switch (status) {
    case "validating":
    case "uploading":
    case "processing":
      return (
        <IconPlaceholder
          lucide="LoaderCircleIcon"
          tabler="IconLoader2"
          hugeicons="Loading03Icon"
          phosphor="CircleNotchIcon"
          remixicon="RiLoader4Line"
          aria-hidden
          className={className}
        />
      )
    case "scanning":
      return (
        <IconPlaceholder
          lucide="ShieldCheckIcon"
          tabler="IconShieldCheck"
          hugeicons="Shield01Icon"
          phosphor="ShieldCheckIcon"
          remixicon="RiShieldCheckLine"
          aria-hidden
          className={className}
        />
      )
    case "success":
      return (
        <IconPlaceholder
          lucide="CircleCheckIcon"
          tabler="IconCircleCheckFilled"
          hugeicons="CheckmarkCircle01Icon"
          phosphor="CheckCircleIcon"
          remixicon="RiCheckboxCircleFill"
          aria-hidden
          className={className}
        />
      )
    case "error":
    case "rejected":
      return (
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconExclamationCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
          aria-hidden
          className={className}
        />
      )
    case "paused":
      return (
        <IconPlaceholder
          lucide="PauseIcon"
          tabler="IconPlayerPause"
          hugeicons="PauseIcon"
          phosphor="PauseIcon"
          remixicon="RiPauseLine"
          aria-hidden
          className={className}
        />
      )
    default:
      return null
  }
}

/** A compact status label with an icon. */
function UploadItemStatus({
  className,
  showIcon = true,
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Status> & {
  showIcon?: boolean
}) {
  const item = useUploadItem()
  const spinning =
    item.status === "uploading" ||
    item.status === "validating" ||
    item.status === "processing"
  return (
    <span
      data-slot="upload-item-status"
      data-status={item.status}
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground data-[status=error]:text-destructive data-[status=rejected]:text-destructive data-[status=success]:text-foreground [&_svg]:size-3.5",
        className
      )}
    >
      {showIcon ? (
        <StatusIcon
          status={item.status}
          className={cn(
            item.status === "success" &&
              "animate-in duration-300 zoom-in-50 motion-reduce:animate-none",
            spinning && "animate-spin motion-reduce:animate-none",
            item.status === "scanning" &&
              "animate-pulse motion-reduce:animate-none"
          )}
        />
      ) : null}
      <UploadPrimitive.Status {...props} />
    </span>
  )
}

/** Validation or upload error. Renders nothing unless the item failed. */
function UploadItemError({
  className,
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Error>) {
  return (
    <UploadPrimitive.Error
      data-slot="upload-item-error"
      className={cn(
        "animate-in text-xs text-destructive fade-in-0 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

const ACTIVE_PROGRESS = new Set([
  "validating",
  "queued",
  "uploading",
  "paused",
  "processing",
  "scanning",
])

function ProgressBar({
  className,
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Progress>) {
  return (
    <UploadPrimitive.Progress
      className={cn(
        "cn-upload-progress group/upload-progress relative w-full overflow-hidden bg-muted",
        className
      )}
      {...props}
    >
      <UploadPrimitive.ProgressIndicator
        className={cn(
          "size-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none",
          "data-indeterminate:animate-pulse motion-reduce:data-indeterminate:animate-none",
          "group-data-[status=error]/upload-progress:bg-destructive group-data-[status=paused]/upload-progress:bg-muted-foreground/60"
        )}
      />
    </UploadPrimitive.Progress>
  )
}

/**
 * The item's progress bar. Hidden once the item is done or failed, pass
 * `forceMount` to always show it.
 */
function UploadItemProgress({
  className,
  forceMount = false,
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Progress> & {
  forceMount?: boolean
}) {
  const item = useUploadItem()
  if (!forceMount && !ACTIVE_PROGRESS.has(item.status)) return null
  return (
    <ProgressBar
      data-slot="upload-item-progress"
      className={cn(
        "basis-full group-data-[variant=tile]/upload-item:mt-1.5",
        className
      )}
      {...props}
    />
  )
}

/** Aggregate progress of the whole queue. */
function UploadProgress(
  props: React.ComponentProps<typeof UploadPrimitive.Progress>
) {
  return <ProgressBar data-slot="upload-progress" {...props} />
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

type ActionProps = React.ComponentProps<typeof UploadPrimitive.Remove> &
  ButtonVariantProps

function createAction(
  Primitive: React.ComponentType<
    React.ComponentProps<typeof UploadPrimitive.Remove>
  >,
  slot: string,
  icon: React.ReactNode
) {
  function Action({
    variant = "ghost",
    size = "icon-xs",
    className,
    children,
    ...props
  }: ActionProps) {
    return (
      <Primitive
        data-slot={slot}
        render={
          <NativeButton variant={variant} size={size} className={className} />
        }
        {...props}
      >
        {children ?? icon}
      </Primitive>
    )
  }
  Action.displayName = slot
  return Action
}

const UploadItemRemove = createAction(
  UploadPrimitive.Remove,
  "upload-item-remove",
  <IconPlaceholder
    lucide="XIcon"
    tabler="IconX"
    hugeicons="Cancel01Icon"
    phosphor="XIcon"
    remixicon="RiCloseLine"
  />
)
const UploadItemCancel = createAction(
  UploadPrimitive.Cancel,
  "upload-item-cancel",
  <IconPlaceholder
    lucide="XIcon"
    tabler="IconX"
    hugeicons="Cancel01Icon"
    phosphor="XIcon"
    remixicon="RiCloseLine"
  />
)
const UploadItemRetry = createAction(
  UploadPrimitive.Retry,
  "upload-item-retry",
  <IconPlaceholder
    lucide="RotateCcwIcon"
    tabler="IconRotate"
    hugeicons="ArrowTurnBackwardIcon"
    phosphor="ArrowCounterClockwiseIcon"
    remixicon="RiArrowGoBackLine"
  />
)
const UploadItemPause = createAction(
  UploadPrimitive.Pause,
  "upload-item-pause",
  <IconPlaceholder
    lucide="PauseIcon"
    tabler="IconPlayerPause"
    hugeicons="PauseIcon"
    phosphor="PauseIcon"
    remixicon="RiPauseLine"
  />
)
const UploadItemResume = createAction(
  UploadPrimitive.Resume,
  "upload-item-resume",
  <IconPlaceholder
    lucide="PlayIcon"
    tabler="IconPlayerPlay"
    hugeicons="PlayIcon"
    phosphor="PlayIcon"
    remixicon="RiPlayLine"
  />
)

const FINISHED = new Set(["success", "error", "rejected", "cancelled"])

/**
 * Item actions. Without children it shows the applicable ones: pause,
 * resume, retry, and cancel (while active) or remove (when waiting or
 * finished).
 */
function UploadItemActions({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const item = useUploadItem()
  return (
    <div
      data-slot="upload-item-actions"
      className={cn(
        "ms-auto flex shrink-0 items-center gap-0.5 group-data-[variant=tile]/upload-item:absolute group-data-[variant=tile]/upload-item:top-1.5 group-data-[variant=tile]/upload-item:right-1.5 group-data-[variant=tile]/upload-item:rounded-md group-data-[variant=tile]/upload-item:bg-background/85 group-data-[variant=tile]/upload-item:backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <UploadItemPause />
          <UploadItemResume />
          <UploadItemRetry />
          {FINISHED.has(item.status) || item.status === "idle" ? (
            <UploadItemRemove />
          ) : (
            <UploadItemCancel />
          )}
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Queue-level                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Turns any content into a drop target: while files are dragged over it, a
 * frosted layer with `label` covers the content. Click-through is disabled,
 * so the content stays interactive.
 */
function UploadOverlay({
  className,
  label = "Drop files to upload",
  description,
  children,
  ...props
}: Omit<React.ComponentProps<typeof UploadPrimitive.Dropzone>, "clickable"> & {
  label?: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <UploadPrimitive.Dropzone
      data-slot="upload-overlay"
      clickable={false}
      className={cn("group/upload-overlay relative", className)}
      {...props}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 flex scale-95 flex-col items-center justify-center gap-1.5 rounded-[inherit] border-2 border-dashed border-primary/60 bg-background/80 text-center opacity-0 backdrop-blur-sm transition-[opacity,transform] duration-200 group-data-drag-reject/upload-overlay:border-destructive/60 group-data-dragging/upload-overlay:scale-100 group-data-dragging/upload-overlay:opacity-100 motion-reduce:transition-none"
      >
        <span className="flex size-10 items-center justify-center rounded-full border bg-background text-foreground shadow-sm">
          <IconPlaceholder
            lucide="UploadIcon"
            tabler="IconUpload"
            hugeicons="Upload01Icon"
            phosphor="UploadSimpleIcon"
            remixicon="RiUploadLine"
            className="size-4"
          />
        </span>
        <span className="text-sm font-medium">{label}</span>
        {description ? (
          <span className="text-xs text-muted-foreground">{description}</span>
        ) : null}
      </div>
    </UploadPrimitive.Dropzone>
  )
}

function UploadHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-header"
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

function UploadFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-footer"
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-end gap-2 border-t pt-3",
        className
      )}
      {...props}
    />
  )
}

/**
 * The queue at a glance, "3 files · 12.4 MB · 45% · 8s left" by default.
 * Renders nothing while the queue is empty. Pass children to customize.
 */
function UploadSummary({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  if (summary.total === 0 && children == null) return null
  const parts = [
    `${summary.total} file${summary.total === 1 ? "" : "s"}`,
    formatBytes(summary.size),
  ]
  if (summary.isUploading) {
    parts.push(`${Math.round(summary.percent)}%`)
    const eta = formatDuration(summary.eta)
    if (eta) parts.push(`${eta} left`)
  } else if (summary.hasErrors) {
    parts.push(`${summary.counts.error} failed`)
  } else if (summary.isComplete) {
    parts.push("all uploaded")
  }
  return (
    <p
      data-slot="upload-summary"
      aria-live="off"
      className={cn("text-xs text-muted-foreground tabular-nums", className)}
      {...props}
    >
      {children ?? parts.join(" · ")}
    </p>
  )
}

/* -------------------------------------------------------------------------- */
/* Slot                                                                       */
/* -------------------------------------------------------------------------- */

/** The file in a named slot, if any. Use inside `<Upload>`. */
function useUploadSlot(name: string) {
  const { uploader } = useUploadContext()
  return useUploadSelector(uploader, (state) =>
    state.items.find(
      (item) => item.meta.slot === name && item.status !== "cancelled"
    )
  )
}

/**
 * A named, single-file slot inside a shared `<Upload>`, "ID front",
 * "Resume", "Proof of address". Each slot has its own picker and drop
 * target, replaces its own file, and tags it with `meta.slot`.
 * Inside, every `UploadItem*` part works for the slot's file.
 */
function UploadSlot({
  name,
  label,
  description,
  accept,
  icon,
  required,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  name: string
  label: React.ReactNode
  description?: React.ReactNode
  accept?: ValidationOptions["accept"]
  icon?: React.ReactNode
  required?: boolean
  /** Content for a filled slot. Defaults to the file with its actions. */
  children?: React.ReactNode
}) {
  const { uploader, disabled } = useUploadContext()
  const item = useUploadSlot(name)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [issue, setIssue] = React.useState<string | null>(null)
  const inputId = React.useId()

  const add = (files: File[]) => {
    const file = files[0]
    if (!file || disabled) return
    if (accept && !matchesAccept(file, accept)) {
      setIssue(`${file.name} isn't an accepted file type`)
      return
    }
    setIssue(null)
    if (item) uploader.remove(item.id)
    void uploader.add([file], { meta: { slot: name } })
  }
  const { isDragging, isDragReject, handlers } = useDropzone({
    onDrop: add,
    accept,
    multiple: false,
    disabled,
  })
  const open = () => inputRef.current?.click()

  return (
    <div
      data-slot="upload-slot"
      data-name={name}
      data-filled={item ? "" : undefined}
      data-status={item?.status}
      data-dragging={isDragging ? "" : undefined}
      data-drag-reject={isDragReject ? "" : undefined}
      className={cn(
        "cn-upload-item group/upload-slot relative flex min-w-0 flex-col border border-dashed border-input transition-colors",
        "data-filled:border-solid data-filled:bg-card data-[status=error]:border-destructive/50 data-[status=rejected]:border-destructive/50",
        "data-drag-reject:border-destructive data-dragging:border-primary data-dragging:bg-muted/60",
        className
      )}
      {...handlers}
      {...props}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        hidden
        tabIndex={-1}
        aria-label={
          typeof label === "string" ? `Upload ${label}` : "Upload file"
        }
        accept={toAcceptAttribute(accept)}
        disabled={disabled}
        onChange={(event) => {
          add(Array.from(event.currentTarget.files ?? []))
          event.currentTarget.value = ""
        }}
      />
      {item ? (
        <UploadItemContext.Provider value={item}>
          {children ?? (
            <div className="cn-upload-item-size-default flex min-w-0 flex-wrap items-center">
              <UploadItemMedia />
              <UploadItemContent>
                <span className="text-xs text-muted-foreground">{label}</span>
                <UploadItemTitle />
                <UploadItemDescription />
              </UploadItemContent>
              <UploadItemActions>
                <UploadItemRetry />
                <NativeButton
                  variant="ghost"
                  size="xs"
                  onClick={open}
                  disabled={disabled}
                >
                  Replace
                </NativeButton>
                <UploadItemRemove />
              </UploadItemActions>
              <UploadItemProgress />
            </div>
          )}
        </UploadItemContext.Provider>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={disabled}
          className="cn-upload-item-size-default flex min-w-0 items-center rounded-[inherit] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          <span className="cn-upload-item-media flex shrink-0 items-center justify-center border bg-muted text-muted-foreground transition-transform group-data-dragging/upload-slot:scale-110 [&_svg:not([class*='size-'])]:size-4">
            {icon ?? (
              <IconPlaceholder
                lucide="UploadIcon"
                tabler="IconUpload"
                hugeicons="Upload01Icon"
                phosphor="UploadSimpleIcon"
                remixicon="RiUploadLine"
              />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="cn-upload-item-title">
              {label}
              {required ? (
                <span className="text-muted-foreground"> (required)</span>
              ) : null}
            </span>
            {description ? (
              <span className="cn-upload-item-description text-muted-foreground">
                {description}
              </span>
            ) : null}
          </span>
        </button>
      )}
      {issue ? (
        <p
          role="alert"
          className="cn-upload-item-size-default pt-0 text-xs text-destructive"
        >
          {issue}
        </p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

const ModalContext = React.createContext<{
  titleId: string
  descriptionId: string
  close: () => void
} | null>(null)

/**
 * A modal built on the native `<dialog>` element: focus trap, Escape and the
 * top layer come from the browser, so it behaves the same on every shadcn
 * base and needs no portal (it stays inside the Upload context).
 */
function UploadModal({
  open,
  onOpenChange,
  showCloseButton = true,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"dialog">, "open"> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  showCloseButton?: boolean
}) {
  const ref = React.useRef<HTMLDialogElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])
  const context = React.useMemo(
    () => ({ titleId, descriptionId, close }),
    [titleId, descriptionId, close]
  )

  return (
    <dialog
      ref={ref}
      data-slot="upload-modal"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) close()
      }}
      className={cn(
        "cn-upload-modal mx-4 my-auto w-auto max-w-lg bg-popover p-0 text-popover-foreground outline-none sm:mx-auto sm:w-full",
        "backdrop:bg-black/50 open:animate-in open:fade-in-0 open:zoom-in-95 motion-reduce:open:animate-none",
        className
      )}
      {...props}
    >
      <ModalContext.Provider value={context}>
        {open ? (
          <div className="cn-upload-modal-body relative flex flex-col">
            {children}
            {showCloseButton ? (
              <NativeButton
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                className="absolute top-3 right-3"
                onClick={close}
              >
                <IconPlaceholder
                  lucide="XIcon"
                  tabler="IconX"
                  hugeicons="Cancel01Icon"
                  phosphor="XIcon"
                  remixicon="RiCloseLine"
                />
              </NativeButton>
            ) : null}
          </div>
        ) : null}
      </ModalContext.Provider>
    </dialog>
  )
}

function useModal() {
  const context = React.useContext(ModalContext)
  if (!context) throw new Error("Modal parts must be inside <UploadModal>")
  return context
}

function UploadModalHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-modal-header"
      className={cn("flex flex-col gap-1.5 pe-8 text-left", className)}
      {...props}
    />
  )
}

function UploadModalTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useModal()
  return (
    <h2
      id={titleId}
      data-slot="upload-modal-title"
      className={cn("cn-upload-modal-title", className)}
      {...props}
    />
  )
}

function UploadModalDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { descriptionId } = useModal()
  return (
    <p
      id={descriptionId}
      data-slot="upload-modal-description"
      className={cn("cn-upload-modal-description", className)}
      {...props}
    />
  )
}

function UploadModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="upload-modal-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

const UploadEmpty = UploadPrimitive.Empty
const UploadSuccess = UploadPrimitive.Success

function UploadStart({
  variant = "default",
  size = "sm",
  className,
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Start> & ButtonVariantProps) {
  return (
    <UploadPrimitive.Start
      data-slot="upload-start"
      render={
        <NativeButton variant={variant} size={size} className={className} />
      }
      {...props}
    />
  )
}

function UploadClear({
  variant = "ghost",
  size = "sm",
  className,
  ...props
}: React.ComponentProps<typeof UploadPrimitive.Clear> & ButtonVariantProps) {
  return (
    <UploadPrimitive.Clear
      data-slot="upload-clear"
      render={
        <NativeButton variant={variant} size={size} className={className} />
      }
      {...props}
    />
  )
}

/**
 * The default queue, composed from the parts above. Copy it into your own
 * component when you need a different layout.
 */
function UploadQueue({
  className,
  filter,
  variant = "outline",
  size = "default",
}: {
  className?: string
  filter?: (item: UploadItemData) => boolean
} & VariantProps<typeof uploadItemVariants>) {
  return (
    <UploadList className={className} filter={filter}>
      {(item) => (
        <UploadItem key={item.id} item={item} variant={variant} size={size}>
          <UploadItemMedia />
          <UploadItemContent>
            <UploadItemTitle />
            <UploadItemDescription />
          </UploadItemContent>
          <UploadItemActions />
          <UploadItemProgress />
        </UploadItem>
      )}
    </UploadList>
  )
}

export {
  NativeButton,
  UploadModal,
  UploadModalDescription,
  UploadModalFooter,
  UploadModalHeader,
  UploadModalTitle,
  Upload,
  UploadSlot,
  useUploadSlot,
  UploadClear,
  UploadFooter,
  UploadHeader,
  UploadOverlay,
  UploadSummary,
  UploadDropzone,
  UploadDropzoneContent,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadEmpty,
  UploadFileIcon,
  UploadSpinner,
  UploadItem,
  UploadItemActions,
  UploadItemCancel,
  UploadItemContent,
  UploadItemDescription,
  UploadItemError,
  UploadItemMedia,
  UploadItemPause,
  UploadItemProgress,
  UploadItemRemove,
  UploadItemResume,
  UploadItemRetry,
  UploadItemStatus,
  UploadItemTitle,
  UploadList,
  UploadProgress,
  UploadQueue,
  UploadStart,
  UploadSuccess,
  UploadTrigger,
  getFileKind,
  uploadDropzoneVariants,
  uploadItemVariants,
}
