"use client"

import * as React from "react"
import {
  formatBytes,
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
import { Badge } from "@/components/ui/badge"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadProgress,
  UploadTrigger,
} from "@/registry/default/ui/upload"

export interface CsvColumn {
  /** Header name to look for (case- and space-insensitive). */
  key: string
  label?: string
  required?: boolean
}

const DEFAULT_COLUMNS: CsvColumn[] = [
  { key: "sku", label: "SKU", required: true },
  { key: "title", label: "Title", required: true },
  { key: "price", label: "Price", required: true },
  { key: "inventory", label: "Inventory" },
]

interface CsvImportProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  /** Expected columns. Default: a product catalog (sku, title, price…). */
  columns?: CsvColumn[]
  /** Default 50 MB. */
  maxSize?: number
  onSuccess?: (item: UploadItemData<TResult>, preview: CsvPreview) => void
  className?: string
}

export interface CsvPreview {
  headers: string[]
  rows: string[][]
  rowCount: number
  missing: CsvColumn[]
}

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")

/** A small RFC 4180 parser: quotes, escaped quotes and CRLF. */
function parseCsv(text: string, limit = Infinity) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++
      row.push(field)
      field = ""
      if (row.some((cell) => cell !== "")) rows.push(row)
      row = []
      if (rows.length >= limit) break
    } else field += char
  }
  if (field !== "" || row.length) {
    row.push(field)
    if (row.some((cell) => cell !== "")) rows.push(row)
  }
  return rows
}

async function preview(file: File, columns: CsvColumn[]): Promise<CsvPreview> {
  const text = await file.text()
  const [headers = [], ...rows] = parseCsv(text)
  const present = new Set(headers.map(normalize))
  return {
    headers,
    rows: rows.slice(0, 5),
    rowCount: rows.length,
    missing: columns.filter(
      (column) => column.required && !present.has(normalize(column.key))
    ),
  }
}

/**
 * Bulk import from a spreadsheet: the CSV is checked in the browser,
 * required columns and a preview of the first rows, before anything is
 * uploaded.
 */
function CsvImport<TResult = unknown>({
  adapter,
  uploader,
  columns = DEFAULT_COLUMNS,
  maxSize = 50 * 1000 * 1000,
  onSuccess,
  className,
}: CsvImportProps<TResult>) {
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: ".csv,text/csv",
            maxFiles: 1,
            maxSize,
            autoUpload: false,
          }) as UploadRootProps<TResult>)}
      multiple={false}
      className={className}
    >
      <Importer
        columns={columns}
        onSuccess={
          onSuccess as
            ((item: UploadItemData, preview: CsvPreview) => void) | undefined
        }
      />
    </Upload>
  )
}

function Importer({
  columns,
  onSuccess,
}: {
  columns: CsvColumn[]
  onSuccess?: (item: UploadItemData, preview: CsvPreview) => void
}) {
  const { uploader } = useUploadContext()
  const item = useUploadSelector(uploader, (state) => state.items[0])
  const [parsed, setParsed] = React.useState<{
    id: string
    preview: CsvPreview
  } | null>(null)
  const current =
    parsed && item && parsed.id === item.id ? parsed.preview : null

  React.useEffect(() => {
    if (!item || item.status === "rejected") return
    let cancelled = false
    void preview(item.file, columns).then((result) => {
      if (!cancelled) setParsed({ id: item.id, preview: result })
    })
    return () => {
      cancelled = true
    }
  }, [item?.id, item?.file, item?.status, columns]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSuccessRef = React.useRef(onSuccess)
  React.useEffect(() => {
    onSuccessRef.current = onSuccess
  })
  React.useEffect(
    () =>
      uploader.on("success", ({ item: done }) => {
        if (parsed && parsed.id === done.id) {
          onSuccessRef.current?.(done, parsed.preview)
        }
      }),
    [uploader, parsed]
  )

  if (!item) {
    return (
      <UploadDropzone>
        <UploadDropzoneHeader>
          <UploadDropzoneMedia variant="icon">
            <IconPlaceholder
              lucide="FileSpreadsheetIcon"
              tabler="IconFileSpreadsheet"
              hugeicons="Xls01Icon"
              phosphor="FileXlsIcon"
              remixicon="RiFileExcel2Line"
            />
          </UploadDropzoneMedia>
          <UploadDropzoneTitle>Import products from CSV</UploadDropzoneTitle>
          <UploadDropzoneDescription>
            Columns:{" "}
            {columns.map((column) => column.label ?? column.key).join(", ")}
          </UploadDropzoneDescription>
        </UploadDropzoneHeader>
      </UploadDropzone>
    )
  }

  const present = new Set(current?.headers.map(normalize))
  const done = item.status === "success"
  const busy = item.status !== "idle" && !done && item.status !== "error"

  return (
    <div className="cn-upload-card flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted">
          <IconPlaceholder
            lucide="FileSpreadsheetIcon"
            tabler="IconFileSpreadsheet"
            hugeicons="Xls01Icon"
            phosphor="FileXlsIcon"
            remixicon="RiFileExcel2Line"
            className="size-4 text-muted-foreground"
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatBytes(item.size)}
            {current ? ` · ${current.rowCount.toLocaleString()} rows` : ""}
          </span>
        </div>
        <UploadTrigger variant="ghost" size="sm" disabled={busy}>
          <IconPlaceholder
            lucide="RefreshCwIcon"
            tabler="IconRefresh"
            hugeicons="RepeatIcon"
            phosphor="ArrowsClockwiseIcon"
            remixicon="RiRefreshLine"
            data-icon="inline-start"
          />
          Replace
        </UploadTrigger>
      </div>

      {item.status === "rejected" ? (
        <p className="text-sm text-destructive">{item.issues[0]?.message}</p>
      ) : null}

      {current ? (
        <>
          <ul className="flex flex-wrap gap-1.5" aria-label="Columns">
            {columns.map((column) => {
              const found = present.has(normalize(column.key))
              return (
                <li key={column.key}>
                  <Badge
                    variant={
                      found
                        ? "secondary"
                        : column.required
                          ? "destructive"
                          : "outline"
                    }
                    className="gap-1"
                  >
                    {found ? (
                      <IconPlaceholder
                        lucide="CheckIcon"
                        tabler="IconCheck"
                        hugeicons="Tick02Icon"
                        phosphor="CheckIcon"
                        remixicon="RiCheckLine"
                      />
                    ) : column.required ? (
                      <IconPlaceholder
                        lucide="TriangleAlertIcon"
                        tabler="IconAlertTriangle"
                        hugeicons="Alert02Icon"
                        phosphor="WarningIcon"
                        remixicon="RiErrorWarningLine"
                      />
                    ) : null}
                    {column.label ?? column.key}
                    <span className="sr-only">
                      {found
                        ? "found"
                        : column.required
                          ? "missing, required"
                          : "missing, optional"}
                    </span>
                  </Badge>
                </li>
              )
            })}
          </ul>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {current.headers.map((header, index) => (
                    <TableHead
                      key={index}
                      className={cn(
                        !columns.some(
                          (column) =>
                            normalize(column.key) === normalize(header)
                        ) && "text-muted-foreground"
                      )}
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {current.headers.map((_, cellIndex) => (
                      <TableCell key={cellIndex} className="max-w-40 truncate">
                        {row[cellIndex]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {current.rowCount > current.rows.length ? (
            <p className="text-xs text-muted-foreground">
              Showing {current.rows.length} of{" "}
              {current.rowCount.toLocaleString()} rows
            </p>
          ) : null}
        </>
      ) : null}

      {busy ? <UploadProgress /> : null}
      {item.status === "error" ? (
        <p className="text-sm text-destructive">{item.error?.message}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {current && current.missing.length > 0 ? (
          <p className="me-auto text-xs text-destructive">
            Missing{" "}
            {current.missing
              .map((column) => column.label ?? column.key)
              .join(", ")}
          </p>
        ) : null}
        {done ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
              className="size-4"
            />
            Imported {current?.rowCount.toLocaleString()} rows
          </span>
        ) : (
          <NativeButton
            disabled={!current || current.missing.length > 0 || busy}
            onClick={() =>
              item.status === "error"
                ? uploader.retry(item.id)
                : uploader.start()
            }
          >
            {busy
              ? "Importing…"
              : item.status === "error"
                ? "Try again"
                : `Import ${current?.rowCount.toLocaleString() ?? ""} rows`}
          </NativeButton>
        )}
      </div>
    </div>
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

export { CsvImport, type CsvImportProps }
