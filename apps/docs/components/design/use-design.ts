"use client"

import * as React from "react"

import {
  DEFAULT_DESIGN,
  DESIGN_CLASS_PREFIXES,
  DESIGN_STORAGE_KEY,
  type DesignConfig,
  designAttributes,
  normalizeDesign,
} from "@/lib/design"

const EVENT = "uploadcn-design-change"
let cachedRaw: string | null | undefined
let cached: DesignConfig = DEFAULT_DESIGN

function read(): DesignConfig {
  let raw: string | null
  try {
    raw = localStorage.getItem(DESIGN_STORAGE_KEY)
  } catch {
    return cached
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cached = normalizeDesign(raw ? JSON.parse(raw) : DEFAULT_DESIGN)
    } catch {
      cached = DEFAULT_DESIGN
    }
  }
  return cached
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DESIGN_STORAGE_KEY) onChange()
  }
  window.addEventListener(EVENT, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener("storage", onStorage)
  }
}

/** Applies a design to <html>: style, colors, font, radius, icon library. */
export function applyDesign(config: DesignConfig) {
  const html = document.documentElement
  for (const name of Array.from(html.classList)) {
    if (DESIGN_CLASS_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      html.classList.remove(name)
    }
  }
  const { classes, radius, iconLibrary } = designAttributes(config)
  html.classList.add(...classes)
  if (radius) html.dataset.radius = radius
  else delete html.dataset.radius
  html.dataset.iconLibrary = iconLibrary
}

export function setDesign(next: DesignConfig) {
  const config = normalizeDesign(next)
  try {
    localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Not persisted, but still applied for this page.
    cached = config
  }
  applyDesign(config)
  window.dispatchEvent(new Event(EVENT))
}

/** The current design. Defaults on the server and during hydration. */
export function useDesign(): DesignConfig {
  return React.useSyncExternalStore(subscribe, read, () => DEFAULT_DESIGN)
}
