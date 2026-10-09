import * as React from "react"

/**
 * Replace a primitive's element, like Base UI's `render` prop:
 * pass an element to clone (`render={<Button />}`) or a function that
 * receives the merged props and the component state.
 */
export type RenderProp<TState> =
  | React.ReactElement<Record<string, unknown>>
  | ((props: Record<string, unknown>, state: TState) => React.ReactElement)

type AnyProps = Record<string, unknown>

function mergeRefs(...refs: unknown[]) {
  const live = refs.filter(Boolean)
  if (live.length <= 1) return live[0]
  return (value: unknown) => {
    const cleanups: (() => void)[] = []
    for (const ref of live) {
      if (typeof ref === "function") {
        const cleanup = ref(value)
        if (typeof cleanup === "function") cleanups.push(cleanup)
      } else if (ref && typeof ref === "object" && "current" in ref) {
        ;(ref as { current: unknown }).current = value
      }
    }
    return () => {
      for (const cleanup of cleanups) cleanup()
      for (const ref of live) {
        if (ref && typeof ref === "object" && "current" in ref) {
          ;(ref as { current: unknown }).current = null
        }
      }
    }
  }
}

/**
 * Merges two prop objects: event handlers run in sequence (unless the first
 * calls `preventDefault`), classNames concatenate, styles shallow-merge,
 * refs combine, and everything else from `overrides` wins.
 */
export function mergeProps(base: AnyProps, overrides: AnyProps): AnyProps {
  const merged: AnyProps = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    const current = merged[key]
    if (
      /^on[A-Z]/.test(key) &&
      typeof current === "function" &&
      typeof value === "function"
    ) {
      merged[key] = (...args: unknown[]) => {
        ;(value as (...a: unknown[]) => void)(...args)
        const event = args[0] as { defaultPrevented?: boolean } | undefined
        if (!event?.defaultPrevented) {
          ;(current as (...a: unknown[]) => void)(...args)
        }
      }
    } else if (key === "className" && current && value) {
      merged[key] = `${current as string} ${value as string}`
    } else if (key === "style" && current && value) {
      merged[key] = { ...(current as object), ...(value as object) }
    } else if (key === "ref") {
      merged[key] = mergeRefs(current, value)
    } else if (value !== undefined) {
      merged[key] = value
    }
  }
  return merged
}

/** Renders `tag`, or the user's `render` element/function with merged props. */
export function renderElement<TState>(
  tag: keyof React.JSX.IntrinsicElements,
  props: AnyProps,
  render: RenderProp<TState> | undefined,
  state: TState
): React.ReactElement {
  if (!render) return React.createElement(tag, props)
  if (typeof render === "function") return render(props, state)
  return React.cloneElement(render, mergeProps(props, render.props))
}

/** Converts truthy booleans to `""` data attributes and drops falsy ones. */
export function dataAttributes(
  attributes: Record<string, string | number | boolean | null | undefined>
) {
  const result: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (value === true) result[`data-${key}`] = ""
    else if (value !== false && value != null) result[`data-${key}`] = value
  }
  return result
}
