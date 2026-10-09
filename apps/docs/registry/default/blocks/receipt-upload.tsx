"use client"

import * as React from "react"
import {
  type OcrRecognizer,
  type OcrResult,
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

import { IconPlaceholder } from "@/components/icon-placeholder"
import { Input } from "@/components/ui/input"
import {
  NativeButton,
  Upload,
  UploadDropzone,
  UploadDropzoneDescription,
  UploadDropzoneHeader,
  UploadDropzoneMedia,
  UploadDropzoneTitle,
  UploadItemMedia,
  UploadItemProgress,
  UploadItemStatus,
  UploadTrigger,
} from "@/registry/default/ui/upload"

export interface ReceiptFields {
  merchant: string
  date: string
  amount: string
  category: string
}

interface ReceiptUploadProps<TResult> {
  adapter?: UploadAdapter<TResult>
  /** Use an uploader you created with `useUploader` instead of options. */
  uploader?: Uploader<TResult>
  categories?: string[]
  /**
   * Pre-fill the form after upload, call your OCR or AI extraction here.
   * Fields the user already typed are never overwritten.
   */
  extract?: (item: UploadItemData<TResult>) => Promise<Partial<ReceiptFields>>
  /**
   * Read the receipt with OCR and pre-fill merchant, date and amount, e.g.
   * `ocrEndpoint("/api/ocr")` with Textract's expense model or Azure's
   * receipt model. Used when `extract` isn't set.
   */
  recognize?: OcrRecognizer
  onSubmit?: (
    expense: ReceiptFields & { receipt: UploadItemData<TResult> }
  ) => void
  className?: string
}

const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ")

/** Normalizes a date to YYYY-MM-DD for `<input type="date">`, or "". */
function toIsoDate(value: string) {
  const iso = value.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  const dmy = value.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  const named = value.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})/i)
  let parts: [number, number, number] | undefined
  if (iso) parts = [+iso[1]!, +iso[2]!, +iso[3]!]
  else if (named && MONTHS.includes(named[2]!.toLowerCase())) {
    parts = [
      +named[3]!,
      MONTHS.indexOf(named[2]!.toLowerCase()) + 1,
      +named[1]!,
    ]
  } else if (dmy) {
    const year = +dmy[3]! < 100 ? 2000 + +dmy[3]! : +dmy[3]!
    // Day first unless that can't be (e.g. 12/31/2026).
    const [day, month] =
      +dmy[2]! > 12 ? [+dmy[2]!, +dmy[1]!] : [+dmy[1]!, +dmy[2]!]
    parts = [year, month, day]
  }
  if (!parts || parts[1] < 1 || parts[1] > 12 || parts[2] < 1 || parts[2] > 31)
    return ""
  return parts
    .map((part, index) => String(part).padStart(index ? 2 : 4, "0"))
    .join("-")
}

/**
 * Maps an OCR result to receipt fields. Uses the engine's fields when it
 * has them (Textract expense, Azure receipt), and the text otherwise.
 */
export function receiptFromOcr(result: OcrResult): Partial<ReceiptFields> {
  const fields = result.fields ?? {}
  const lines = result.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const amountFrom = (value?: string) =>
    value
      ?.match(/\d[\d.,]*\d|\d/)?.[0]
      ?.replace(/,(?=\d{2}$)/, ".")
      .replace(/,/g, "") ?? ""
  const totalLine = [...lines]
    .reverse()
    .find(
      (line) =>
        /\b(total|amount due|balance)\b/i.test(line) &&
        !/sub\s?total/i.test(line)
    )
  return {
    merchant: fields.merchant?.value ?? lines[0] ?? "",
    date: toIsoDate(
      fields.date?.value ?? lines.find((line) => toIsoDate(line)) ?? ""
    ),
    amount: amountFrom(
      fields.total?.value ?? fields.amountDue?.value ?? totalLine
    ),
  }
}

const EMPTY: ReceiptFields = {
  merchant: "",
  date: "",
  amount: "",
  category: "",
}

/**
 * Expense capture: snap or drop a receipt, fill in the details (or let
 * your OCR do it), submit. The receipt uploads while the form is filled.
 */
function ReceiptUpload<TResult = unknown>({
  adapter,
  uploader,
  categories = ["Travel", "Meals", "Software", "Office", "Other"],
  extract,
  recognize,
  onSubmit,
  className,
}: ReceiptUploadProps<TResult>) {
  const fromOcr = React.useMemo(
    () =>
      recognize
        ? async (item: UploadItemData<TResult>) =>
            receiptFromOcr(
              await recognize(item.file, {
                signal: new AbortController().signal,
              })
            )
        : undefined,
    [recognize]
  )
  return (
    <Upload
      {...((uploader
        ? { uploader }
        : {
            adapter,
            accept: "image/*,application/pdf",
            maxFiles: 1,
            maxSize: 10 * 1000 * 1000,
          }) as UploadRootProps<TResult>)}
      multiple={false}
      capture="environment"
      className={className}
    >
      <Receipt
        categories={categories}
        extract={(extract ?? fromOcr) as ReceiptUploadProps<unknown>["extract"]}
        onSubmit={onSubmit as ReceiptUploadProps<unknown>["onSubmit"]}
      />
    </Upload>
  )
}

function Receipt({
  categories,
  extract,
  onSubmit,
}: Pick<ReceiptUploadProps<unknown>, "extract" | "onSubmit"> & {
  categories: string[]
}) {
  const { uploader } = useUploadContext()
  const item = useUploadSelector(uploader, (state) =>
    state.items.find((entry) => entry.status !== "cancelled")
  )
  const [fields, setFields] = React.useState(EMPTY)
  const [extracting, setExtracting] = React.useState(false)
  const extractedFor = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (
      !extract ||
      item?.status !== "success" ||
      extractedFor.current === item.id
    )
      return
    extractedFor.current = item.id
    let cancelled = false
    void Promise.resolve()
      .then(() => {
        if (!cancelled) setExtracting(true)
        return extract(item)
      })
      .then((found) => {
        if (cancelled) return
        setFields((current) => ({
          merchant: current.merchant || found.merchant || "",
          date: current.date || found.date || "",
          amount: current.amount || found.amount || "",
          category: current.category || found.category || "",
        }))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setExtracting(false)
      })
    return () => {
      cancelled = true
    }
  }, [extract, item])

  const set = (key: keyof ReceiptFields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }))
  const complete =
    item?.status === "success" &&
    fields.merchant &&
    fields.amount &&
    fields.date

  return (
    <form
      className="cn-upload-card grid gap-4 sm:grid-cols-5 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (complete && item) onSubmit?.({ ...fields, receipt: item })
      }}
    >
      <div className="sm:col-span-2">
        {item && item.status !== "rejected" ? (
          <UploadItemContext.Provider value={item}>
            <div className="flex flex-col gap-2">
              <div className="relative aspect-3/4 overflow-hidden rounded-lg border bg-muted">
                <UploadItemMedia
                  variant="cover"
                  className="[&_img]:object-contain"
                />
                <UploadItemProgress className="absolute inset-x-3 bottom-3 w-auto bg-background/60" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <UploadItemStatus />
                <UploadTrigger variant="ghost" size="xs">
                  Replace
                </UploadTrigger>
              </div>
            </div>
          </UploadItemContext.Provider>
        ) : (
          <UploadDropzone className="aspect-3/4 h-auto" size="sm">
            <UploadDropzoneHeader>
              <UploadDropzoneMedia variant="icon">
                <IconPlaceholder
                  lucide="ReceiptIcon"
                  tabler="IconReceipt"
                  hugeicons="Invoice01Icon"
                  phosphor="ReceiptIcon"
                  remixicon="RiBillLine"
                />
              </UploadDropzoneMedia>
              <UploadDropzoneTitle>Add receipt</UploadDropzoneTitle>
              <UploadDropzoneDescription>
                {item?.issues[0]?.message ?? "Photo or PDF"}
              </UploadDropzoneDescription>
            </UploadDropzoneHeader>
          </UploadDropzone>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:col-span-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="cn-upload-card-title">New expense</h3>
          {extracting ? (
            <span className="inline-flex animate-pulse items-center gap-1 text-xs text-muted-foreground motion-reduce:animate-none">
              <IconPlaceholder
                lucide="SparklesIcon"
                tabler="IconSparkles"
                hugeicons="SparklesIcon"
                phosphor="SparkleIcon"
                remixicon="RiSparklingLine"
                className="size-3.5"
              />
              Reading receipt…
            </span>
          ) : null}
        </div>
        <Field label="Merchant" id="receipt-merchant">
          <Input
            id="receipt-merchant"
            value={fields.merchant}
            onChange={(event) => set("merchant")(event.target.value)}
            placeholder="Blue Bottle Coffee"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" id="receipt-date">
            <Input
              id="receipt-date"
              type="date"
              value={fields.date}
              onChange={(event) => set("date")(event.target.value)}
            />
          </Field>
          <Field label="Amount" id="receipt-amount">
            <Input
              id="receipt-amount"
              inputMode="decimal"
              value={fields.amount}
              onChange={(event) => set("amount")(event.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Category</legend>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <NativeButton
                key={category}
                type="button"
                size="xs"
                variant={fields.category === category ? "default" : "outline"}
                aria-pressed={fields.category === category}
                onClick={() => set("category")(category)}
              >
                {category}
              </NativeButton>
            ))}
          </div>
        </fieldset>
        <NativeButton
          type="submit"
          disabled={!complete}
          className={cn("mt-auto")}
        >
          Submit expense
        </NativeButton>
      </div>
    </form>
  )
}

function Field({
  label,
  id,
  children,
}: {
  label: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}

export { ReceiptUpload, type ReceiptUploadProps }
