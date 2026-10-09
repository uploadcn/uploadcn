import { getDroppedFiles, isFileDrag } from "@uploadcn/core"
import * as React from "react"

export interface UseWindowDropOptions {
  /** Called with files dropped anywhere on the page. */
  onDrop: (files: File[]) => void
  /** Turn detection off without unmounting. Default `true`. */
  enabled?: boolean
}

/**
 * Detects files dragged over the browser window — for "drop anywhere"
 * overlays. Drops already handled by an inner dropzone (which calls
 * `preventDefault`) are ignored, so the two can coexist.
 */
export function useWindowDrop({
  onDrop,
  enabled = true,
}: UseWindowDropOptions) {
  const [isDragging, setIsDragging] = React.useState(false)
  const onDropRef = React.useRef(onDrop)
  React.useEffect(() => {
    onDropRef.current = onDrop
  })

  React.useEffect(() => {
    if (!enabled) return
    let depth = 0

    function onDragEnter(event: DragEvent) {
      if (!isFileDrag(event.dataTransfer)) return
      depth++
      setIsDragging(true)
    }
    function onDragOver(event: DragEvent) {
      if (!isFileDrag(event.dataTransfer)) return
      // Required for the drop event to fire.
      event.preventDefault()
    }
    function onDragLeave(event: DragEvent) {
      if (!isFileDrag(event.dataTransfer)) return
      depth = Math.max(0, depth - 1)
      // relatedTarget is null when the pointer leaves the window.
      if (depth === 0 || event.relatedTarget === null) {
        depth = 0
        setIsDragging(false)
      }
    }
    function onDropEvent(event: DragEvent) {
      depth = 0
      setIsDragging(false)
      if (!event.dataTransfer || !isFileDrag(event.dataTransfer)) return
      const handledByDropzone = event.defaultPrevented
      // Stop the browser from navigating to the file.
      event.preventDefault()
      if (handledByDropzone) return
      void getDroppedFiles(event.dataTransfer).then((files) => {
        if (files.length) onDropRef.current(files)
      })
    }
    function onBlur() {
      depth = 0
      setIsDragging(false)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDropEvent)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDropEvent)
      window.removeEventListener("blur", onBlur)
      setIsDragging(false)
    }
  }, [enabled])

  return { isDragging: enabled && isDragging }
}
