"use client"

import * as React from "react"
import { tesseractOcr } from "@uploadcn/core"

import { Button } from "@/components/ui/button"
import { OcrUpload } from "@/registry/default/blocks/ocr-upload"

/**
 * Real OCR in the browser with Tesseract: no server and no key, the file
 * never leaves this page. In your app, `ocrEndpoint("/api/ocr")` sends it
 * to Google Vision, Textract, Azure, Mistral or your own service instead.
 */
const recognize = tesseractOcr({ load: () => import("tesseract.js") })

/** Draws a receipt so there is something to read without your own file. */
async function sampleReceipt() {
  const canvas = document.createElement("canvas")
  canvas.width = 560
  canvas.height = 640
  const context = canvas.getContext("2d")!
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = "#111111"
  const lines: [string, number, string?][] = [
    ["BLUE BOTTLE COFFEE", 34, "bold"],
    ["300 Webster St, Oakland", 22],
    ["2026-03-14  09:42", 22],
    ["", 22],
    ["Cappuccino            4.75", 24],
    ["Almond croissant      5.25", 24],
    ["Cold brew 16oz        4.50", 24],
    ["", 22],
    ["Subtotal             14.50", 24],
    ["Tax                   1.31", 24],
    ["TOTAL                15.81", 30, "bold"],
    ["", 22],
    ["Thank you!", 24],
  ]
  let y = 70
  for (const [text, size, weight] of lines) {
    context.font = `${weight ?? "normal"} ${size}px monospace`
    context.fillText(text, 40, y)
    y += size + 18
  }
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((value) => resolve(value!), "image/png")
  )
  return new File([blob], "receipt.png", { type: "image/png" })
}

export default function OcrUploadExample() {
  const root = React.useRef<HTMLDivElement>(null)

  const trySample = async () => {
    const input = [
      ...(root.current?.querySelectorAll<HTMLInputElement>(
        'input[type="file"]'
      ) ?? []),
    ][0]
    if (!input) return
    const transfer = new DataTransfer()
    transfer.items.add(await sampleReceipt())
    input.files = transfer.files
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }

  return (
    <div ref={root} className="flex w-full max-w-2xl flex-col gap-3">
      <OcrUpload
        recognize={recognize}
        accept="image/png,image/jpeg,image/webp"
      />
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Runs Tesseract in your browser. The first read downloads the engine.
        </span>
        <Button variant="outline" size="sm" onClick={() => void trySample()}>
          Try a sample receipt
        </Button>
      </div>
    </div>
  )
}
