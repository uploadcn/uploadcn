import { getClipboardFiles, isEditableTarget } from "@uploadcn/core"
import * as React from "react"

export interface UsePasteFilesOptions {
  onPaste: (files: File[]) => void
  /**
   * Element to listen on. Defaults to the whole document, which is what chat
   * inputs usually want (paste a screenshot anywhere).
   */
  target?: React.RefObject<HTMLElement | null>
  enabled?: boolean
  /**
   * Leave pastes into text inputs, textareas and `contenteditable` elements
   * alone, even when they carry files. Default `false`, so a composer can
   * take screenshots pasted into its own textarea.
   */
  ignoreEditable?: boolean
}

/** The element a paste was aimed at, also inside shadow roots. */
function pasteTarget(event: Event): EventTarget | null {
  const path =
    typeof event.composedPath === "function" ? event.composedPath() : []
  return path[0] ?? event.target
}

/**
 * Reads the files out of a paste event and claims it, or returns an empty
 * list and leaves the event alone: when another handler already took it,
 * when it carries no files (plain text), or when `ignoreEditable` is set
 * and the user is typing in a field.
 */
export function takePastedFiles(
  event: ClipboardEvent,
  options: { ignoreEditable?: boolean } = {}
): File[] {
  if (event.defaultPrevented) return []
  if (options.ignoreEditable && isEditableTarget(pasteTarget(event))) return []
  const files = getClipboardFiles(event.clipboardData)
  if (files.length === 0) return []
  // Claim the paste so other paste zones don't add the same files again.
  event.preventDefault()
  return files
}

/**
 * Uploads files and screenshots pasted from the clipboard. Text pastes are
 * left alone so inputs keep working normally.
 */
export function usePasteFiles({
  onPaste,
  target,
  enabled = true,
  ignoreEditable = false,
}: UsePasteFilesOptions) {
  const onPasteRef = React.useRef(onPaste)
  React.useEffect(() => {
    onPasteRef.current = onPaste
  })

  React.useEffect(() => {
    if (!enabled) return
    const element: HTMLElement | Document = target?.current ?? document
    function handlePaste(event: Event) {
      const files = takePastedFiles(event as ClipboardEvent, { ignoreEditable })
      if (files.length) onPasteRef.current(files)
    }
    element.addEventListener("paste", handlePaste)
    return () => element.removeEventListener("paste", handlePaste)
  }, [enabled, target, ignoreEditable])
}
