"use client"

import * as React from "react"
import {
  formatBytes,
  type UploadAdapter,
  type Uploader,
  type UploadItem as UploadItemData,
  type ValidationOptions,
} from "@uploadcn/core"
import {
  UploadItemContext,
  useUploadContext,
  useUploadSelector,
  type UploadRootProps,
} from "@uploadcn/react"
import { cn } from "cn"

import { IconPlaceholder } from "@/components/icon-placeholder"
import {
  Upload,
  UploadClear,
  UploadHeader,
  UploadItemActions,
  UploadItemError,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemStatus,
  UploadOverlay,
  UploadSummary,
  UploadTrigger,
} from "@/registry/default/ui/upload"

interface UploadTableProps<TResult> extends Pick<
  ValidationOptions,
  "accept" | "maxSize" | "maxFiles"
> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  title?: string
  onSuccess?: (item: UploadItemData<TResult>) => void
  className?: string
}

/**
 * A data-table view of the queue, name, type, size, status and progress
 * in columns. Drop files anywhere on the table.
 */
function UploadTable<TResult = unknown>({
  adapter,
  uploader,
  title = "Files",
  className,
  ...options
}: UploadTableProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            ...options,
          }) as UploadRootProps<TResult>)}
      className={className}
    >
      <UploadHeader>
        <div className="flex flex-col gap-0.5">
          <h3 className="cn-upload-card-title">{title}</h3>
          <TableSummary />
        </div>
        <div className="flex gap-1.5">
          <UploadClear>Clear finished</UploadClear>
          <UploadTrigger size="sm">
            <IconPlaceholder
              lucide="UploadIcon"
              tabler="IconUpload"
              hugeicons="Upload01Icon"
              phosphor="UploadSimpleIcon"
              remixicon="RiUploadLine"
              data-icon="inline-start"
            />
            Upload
          </UploadTrigger>
        </div>
      </UploadHeader>
      <UploadOverlay className="rounded-lg border" label="Drop to add files">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Name</TableHead>
              <TableHead className="hidden min-w-20 sm:table-cell">
                Size
              </TableHead>
              <TableHead className="min-w-32">Status</TableHead>
              <TableHead className="min-w-16">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <Rows />
        </Table>
      </UploadOverlay>
    </Upload>
  )
}

function TableSummary() {
  const { uploader } = useUploadContext()
  const total = useUploadSelector(uploader, (state) => state.items.length)
  return total === 0 ? (
    <p className="text-xs text-muted-foreground">No files yet</p>
  ) : (
    <UploadSummary />
  )
}

function Rows() {
  const { uploader } = useUploadContext()
  const items = useUploadSelector(uploader, (state) => state.items)

  if (items.length === 0) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="h-40 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <IconPlaceholder
                lucide="FolderOpenIcon"
                tabler="IconFolderOpen"
                hugeicons="FolderOpenIcon"
                phosphor="FolderOpenIcon"
                remixicon="RiFolderOpenLine"
                className="size-5"
              />
              <span className="text-sm">Drop files here to upload</span>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody>
      {items.map((item) => (
        <UploadItemContext.Provider key={item.id} value={item}>
          <TableRow
            data-status={item.status}
            className="data-[status=error]:bg-destructive/5 data-[status=rejected]:bg-destructive/5"
          >
            <TableCell className="max-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <UploadItemMedia className="size-8" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.type || "Unknown type"}
                  </span>
                  <UploadItemError className="truncate" />
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
              {formatBytes(item.size)}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1.5">
                <UploadItemStatus />
                <UploadItemProgress />
              </div>
            </TableCell>
            <TableCell>
              <UploadItemActions className="justify-end" />
            </TableCell>
          </TableRow>
        </UploadItemContext.Provider>
      ))}
    </TableBody>
  )
}

/* Native table parts with shadcn's table styles. React Aria's Table is a
 * collection component with a different API, so a plain <table> keeps this
 * block working on every shadcn base. */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b transition-colors hover:bg-muted/50", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "cn-upload-table-head text-left align-middle font-medium whitespace-nowrap text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "cn-upload-table-cell align-middle whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

export { UploadTable, type UploadTableProps }
