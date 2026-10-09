"use client"

import * as React from "react"
import { formatBytes } from "@uploadcn/core"
import { useFilePreview, useImageCompression } from "@uploadcn/react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function ImageCompressionExample() {
  const [quality, setQuality] = React.useState(0.75)
  const [original, setOriginal] = React.useState<File | null>(null)
  const [result, setResult] = React.useState<File | null>(null)
  const { compress, isCompressing, stats } = useImageCompression({
    maxWidth: 1600,
    maxHeight: 1600,
    quality,
    type: "image/webp",
  })
  const preview = useFilePreview(result)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function run(file: File) {
    setOriginal(file)
    setResult(await compress(file))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          Choose an image
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void run(file)
            event.target.value = ""
          }}
        />
        <div className="flex min-w-48 flex-1 items-center gap-3 text-sm">
          <span className="text-muted-foreground">Quality</span>
          <input
            type="range"
            aria-label="Quality"
            min={0.3}
            max={1}
            step={0.05}
            value={quality}
            onChange={(event) => setQuality(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-primary"
          />
          <span className="w-10 tabular-nums">
            {Math.round(quality * 100)}%
          </span>
        </div>
        {original ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isCompressing}
            onClick={() => void run(original)}
          >
            Recompress
          </Button>
        ) : null}
      </div>
      <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
        {isCompressing ? <Spinner /> : null}
        {!isCompressing && preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img
            src={preview}
            alt="Compressed result"
            className="max-h-80 object-contain"
          />
        ) : null}
        {!isCompressing && !preview ? (
          <p className="text-sm text-muted-foreground">
            Images are resized to 1600px and encoded as WebP in your browser.
          </p>
        ) : null}
      </div>
      {stats ? (
        <p className="text-sm tabular-nums" aria-live="polite">
          {formatBytes(stats.before)} →{" "}
          <strong>{formatBytes(stats.after)}</strong>
          <span className="text-muted-foreground">
            {" "}
            · {Math.round(stats.saved * 100)}% smaller
          </span>
        </p>
      ) : null}
    </div>
  )
}
