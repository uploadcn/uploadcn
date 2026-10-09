import type { Uploader, UploaderState } from "@uploadcn/core"
import * as React from "react"

/**
 * Subscribes to a slice of uploader state. The component re-renders only
 * when the selected value changes (by `isEqual`, default `Object.is`).
 */
export function useUploadSelector<TResult, TSelected>(
  uploader: Uploader<TResult>,
  selector: (state: UploaderState<TResult>) => TSelected,
  isEqual: (a: TSelected, b: TSelected) => boolean = Object.is
): TSelected {
  const cache = React.useRef<{
    state: UploaderState<TResult>
    selector: (state: UploaderState<TResult>) => TSelected
    selected: TSelected
  } | null>(null)

  const getSnapshot = () => {
    const state = uploader.getState()
    const previous = cache.current
    if (
      previous &&
      previous.state === state &&
      previous.selector === selector
    ) {
      return previous.selected
    }
    const selected = selector(state)
    // Keep the previous reference when equal so consumers skip re-rendering.
    const stable =
      previous && isEqual(previous.selected, selected)
        ? previous.selected
        : selected
    cache.current = { state, selector, selected: stable }
    return stable
  }

  return React.useSyncExternalStore(
    uploader.subscribe,
    getSnapshot,
    getSnapshot
  )
}

/** Shallow array equality, for selectors that return lists. */
export function shallowArrayEqual<T>(a: readonly T[], b: readonly T[]) {
  return (
    a.length === b.length &&
    a.every((value, index) => Object.is(value, b[index]))
  )
}
