"use client"

import * as React from "react"

import { trackInstallCopy } from "@/lib/analytics"

/**
 * Docs code blocks come from Fumadocs, so their copy buttons are tracked
 * with one listener: a click on "Copy Text" reports the block's command.
 */
export function CopyTracker() {
  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Fumadocs labels its code block copy button with the text "Copy Text".
      const button = (event.target as Element | null)?.closest?.("button")
      if (!button?.textContent?.includes("Copy Text")) return
      // The button sits in the code block's header (or a tab bar above it),
      // so walk up to the nearest container that holds the code.
      let box = button.parentElement
      for (let depth = 0; box && depth < 6; depth++, box = box.parentElement) {
        const code = box.querySelector("pre")?.textContent
        if (code) return trackInstallCopy(code, "docs")
      }
    }
    document.addEventListener("click", onClick, { capture: true })
    return () =>
      document.removeEventListener("click", onClick, { capture: true })
  }, [])
  return null
}
