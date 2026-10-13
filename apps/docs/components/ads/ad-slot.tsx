"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * One ad network at a time, chosen by environment variables, so ads stay off
 * until a network approves the site:
 * - EthicalAds: NEXT_PUBLIC_ETHICALADS_PUBLISHER
 * - Carbon: NEXT_PUBLIC_CARBON_SERVE (+ NEXT_PUBLIC_CARBON_PLACEMENT)
 * Both networks require being the only ad network on the page.
 */
const ethicalPublisher = process.env.NEXT_PUBLIC_ETHICALADS_PUBLISHER
const carbonServe = process.env.NEXT_PUBLIC_CARBON_SERVE
const carbonPlacement =
  process.env.NEXT_PUBLIC_CARBON_PLACEMENT ?? "uploadcndev"

export const adsEnabled = Boolean(carbonServe || ethicalPublisher)

declare global {
  interface Window {
    ethicalads?: { load(): void; reload(): void }
  }
}

function loadEthicalAds() {
  if (window.ethicalads) return window.ethicalads.load()
  if (document.getElementById("ethicalads-client")) return
  const script = document.createElement("script")
  script.id = "ethicalads-client"
  script.async = true
  script.src = "https://media.ethicalads.io/media/client/ethicalads.min.js"
  script.onload = () => window.ethicalads?.load()
  document.head.appendChild(script)
}

function loadCarbon(box: HTMLElement) {
  // The docs page (and this box) re-mounts on navigation: drop the old
  // script and load it into the new box, which renders a fresh ad.
  document.getElementById("_carbonads_js")?.remove()
  const script = document.createElement("script")
  script.id = "_carbonads_js"
  script.async = true
  script.src = `https://cdn.carbonads.com/carbon.js?serve=${carbonServe}&placement=${carbonPlacement}`
  box.appendChild(script)
}

export function AdSlot({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const box = ref.current
    if (!box) return
    if (carbonServe) loadCarbon(box)
    else if (ethicalPublisher) loadEthicalAds()
  }, [])

  if (!adsEnabled) return null
  return (
    <div ref={ref} className={cn("ad-slot", className)}>
      {!carbonServe && ethicalPublisher ? (
        <div
          data-ea-publisher={ethicalPublisher}
          data-ea-type="image"
          data-ea-manual="true"
          data-ea-dark-selector="html.dark"
          className="bordered"
        />
      ) : null}
    </div>
  )
}
