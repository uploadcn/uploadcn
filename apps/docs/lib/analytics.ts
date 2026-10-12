import { sendGAEvent } from "@next/third-parties/google"

/** Analytics runs only where the GA4 ID is set (production on Netlify). */
export const analyticsEnabled = Boolean(
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
)

/**
 * Records a copied install command as a `copy_install` event, with the
 * `@uploadcn/*` names it installs, so GA shows which components people add.
 */
export function trackInstallCopy(command: string, source: string) {
  if (!analyticsEnabled) return
  const items = [...command.matchAll(/@uploadcn\/([a-z0-9-]+)/g)].map(
    (match) => match[1]
  )
  if (items.length === 0) return
  sendGAEvent("event", "copy_install", { item: items.join(","), source })
}
