import {
  type ValidationOptions,
  getDraggedTypes,
  getDroppedFiles,
  isFileDrag,
  matchesAccept,
} from "@uploadcn/core"
import * as React from "react"

export interface UseDropzoneOptions {
  /** Receives every dropped file, with folders expanded. */
  onDrop: (files: File[]) => void
  /** Used to flag drags of unsupported types before they are dropped. */
  accept?: ValidationOptions["accept"]
  /** Reject drags carrying more than one file. */
  multiple?: boolean
  disabled?: boolean
}

export interface DropzoneState {
  /** Files are being dragged over the zone. */
  isDragging: boolean
  /** The dragged files don't match `accept` (or `multiple`). */
  isDragReject: boolean
}

export interface DropzoneHandlers {
  onDragEnter: React.DragEventHandler
  onDragOver: React.DragEventHandler
  onDragLeave: React.DragEventHandler
  onDrop: React.DragEventHandler
}

/**
 * Drag-and-drop state and handlers for any element. Uses an enter/leave
 * counter so moving over child elements doesn't flicker the drag state.
 */
export function useDropzone(options: UseDropzoneOptions) {
  const { onDrop, accept, multiple = true, disabled = false } = options
  const [state, setState] = React.useState<DropzoneState>({
    isDragging: false,
    isDragReject: false,
  })
  const depth = React.useRef(0)

  const evaluate = React.useCallback(
    (dataTransfer: DataTransfer) => {
      const types = getDraggedTypes(dataTransfer)
      const tooMany = !multiple && types.length > 1
      // Some browsers report empty types while dragging; don't guess.
      const badType = types.some(
        (type) => type !== "" && !matchesAccept({ name: "", type }, accept)
      )
      return tooMany || badType
    },
    [accept, multiple]
  )

  const handlers = React.useMemo<DropzoneHandlers>(
    () => ({
      onDragEnter(event) {
        if (disabled || !isFileDrag(event.dataTransfer)) return
        event.preventDefault()
        depth.current++
        setState({
          isDragging: true,
          isDragReject: evaluate(event.dataTransfer),
        })
      },
      onDragOver(event) {
        if (disabled || !isFileDrag(event.dataTransfer)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      },
      onDragLeave(event) {
        if (disabled || !isFileDrag(event.dataTransfer)) return
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0)
          setState({ isDragging: false, isDragReject: false })
      },
      onDrop(event) {
        if (disabled || !isFileDrag(event.dataTransfer)) return
        // Mark as handled so window-level drop zones ignore it.
        event.preventDefault()
        depth.current = 0
        setState({ isDragging: false, isDragReject: false })
        void getDroppedFiles(event.dataTransfer).then((files) => {
          if (files.length) onDrop(multiple ? files : files.slice(0, 1))
        })
      },
    }),
    [disabled, evaluate, multiple, onDrop]
  )

  return { ...state, handlers }
}
