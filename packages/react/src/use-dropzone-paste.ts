import * as React from "react"

import { takePastedFiles } from "./use-paste-files"

export interface UseDropzonePasteOptions {
  /** Receives the pasted files (screenshots, files copied from the OS). */
  onPaste: (files: File[]) => void
  /** Turn paste off without unmounting. Default `true`. */
  enabled?: boolean
  /**
   * Take file pastes from anywhere on the page, not only while the zone is
   * focused or hovered. Default `false`.
   */
  global?: boolean
}

export interface DropzonePasteHandlers {
  onPointerEnter: React.PointerEventHandler
  onPointerLeave: React.PointerEventHandler
  onFocus: React.FocusEventHandler
  onBlur: React.FocusEventHandler
}

/**
 * Paste-to-upload for a drop zone. Spread `handlers` on the zone: a paste
 * (Ctrl/⌘+V) is taken while the pointer is over the zone or focus is inside
 * it, or anywhere on the page with `global`.
 *
 * Pastes into text inputs, textareas and `contenteditable` elements are
 * never touched, and neither are pastes without files, so typing and
 * pasting text keep working everywhere.
 */
export function useDropzonePaste({
  onPaste,
  enabled = true,
  global = false,
}: UseDropzonePasteOptions) {
  const zone = React.useRef({ hovered: false, focused: false })
  const onPasteRef = React.useRef(onPaste)
  React.useEffect(() => {
    onPasteRef.current = onPaste
  })

  const handlers = React.useMemo<DropzonePasteHandlers>(
    () => ({
      onPointerEnter() {
        zone.current.hovered = true
      },
      onPointerLeave() {
        zone.current.hovered = false
      },
      onFocus() {
        zone.current.focused = true
      },
      onBlur(event) {
        // Focus moving between the zone's own children stays "inside".
        const next = event.relatedTarget as Node | null
        if (!next || !event.currentTarget.contains(next)) {
          zone.current.focused = false
        }
      },
    }),
    []
  )

  React.useEffect(() => {
    if (!enabled) return
    function handlePaste(event: Event) {
      if (!global && !zone.current.hovered && !zone.current.focused) return
      const files = takePastedFiles(event as ClipboardEvent, {
        ignoreEditable: true,
      })
      if (files.length) onPasteRef.current(files)
    }
    // The event reaches `document` before `window`, so a focused or hovered
    // zone always wins over a page-wide one.
    const target: Document | Window = global ? window : document
    target.addEventListener("paste", handlePaste)
    return () => target.removeEventListener("paste", handlePaste)
  }, [enabled, global])

  return { handlers }
}
