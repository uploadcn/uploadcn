import { createRequire } from "node:module"

import { type Locator, type Page, expect } from "@playwright/test"

const require = createRequire(import.meta.url)

/** A 1x1 PNG. */
export const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

export interface PastedFile {
  /** Leave empty for a clipboard bitmap: those have no file name. */
  name: string
  type: string
  base64: string
}

export const screenshot: PastedFile = {
  name: "",
  type: "image/png",
  base64: PNG_BASE64,
}

/**
 * The server-rendered HTML is on screen before React attaches its handlers.
 * Waits until React has hydrated `selector` and its effects have run (the
 * paste listener is registered in one), so events are not fired too early.
 */
export async function hydrated(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toBeVisible()
  await page.waitForFunction((target) => {
    const element = document.querySelector(target)
    return (
      element !== null &&
      Object.keys(element).some((key) => key.startsWith("__reactProps$"))
    )
  }, selector)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
}

/**
 * Dispatches a synthetic `paste` carrying files at the focused element (or
 * at `selector`), the way a browser does on Ctrl/⌘+V. Returns whether a
 * handler claimed the event (`preventDefault`).
 */
export function pasteFiles(page: Page, files: PastedFile[], selector?: string) {
  return page.evaluate(
    ({ files, selector }) => {
      const data = new DataTransfer()
      for (const file of files) {
        const bytes = Uint8Array.from(atob(file.base64), (char) =>
          char.charCodeAt(0)
        )
        data.items.add(new File([bytes], file.name, { type: file.type }))
      }
      const target =
        (selector ? document.querySelector(selector) : null) ??
        document.activeElement ??
        document.body
      const event = new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      })
      target.dispatchEvent(event)
      return event.defaultPrevented
    },
    { files, selector }
  )
}

export interface AxeViolation {
  id: string
  help: string
  nodes: { html: string }[]
}

/** Runs axe-core (with real layout, so contrast counts) inside `scope`. */
export async function axeViolations(page: Page, scope: Locator) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") })
  const violations = await scope.evaluate(async (element) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Element,
            options: object
          ) => Promise<{ violations: AxeViolation[] }>
        }
      }
    ).axe
    // A fragment of a page, not a page: skip the landmark rule.
    const results = await axe.run(element, {
      rules: { region: { enabled: false } },
    })
    return results.violations
  })
  return violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes[0]?.html.slice(0, 120)})`
  )
}
