import { getClipboardFiles } from "@uploadcn/core"
import * as React from "react"

export interface UsePasteFilesOptions {
  onPaste: (files: File[]) => void
  /**
   * Element to listen on. Defaults to the whole document, which is what chat
   * inputs usually want (paste a screenshot anywhere).
   */
  target?: React.RefObject<HTMLElement | null>
  enabled?: boolean
}

/**
 * Uploads files and screenshots pasted from the clipboard. Text pastes are
 * left alone so inputs keep working normally.
 */
export function usePasteFiles({
  onPaste,
  target,
  enabled = true,
}: UsePasteFilesOptions) {
  const onPasteRef = React.useRef(onPaste)
  React.useEffect(() => {
    onPasteRef.current = onPaste
  })

  React.useEffect(() => {
    if (!enabled) return
    const element: HTMLElement | Document = target?.current ?? document
    function handlePaste(event: Event) {
      const files = getClipboardFiles((event as ClipboardEvent).clipboardData)
      if (files.length === 0) return
      event.preventDefault()
      onPasteRef.current(files)
    }
    element.addEventListener("paste", handlePaste)
    return () => element.removeEventListener("paste", handlePaste)
  }, [enabled, target])
}
