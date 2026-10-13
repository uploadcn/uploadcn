"use client"

import * as React from "react"

import { siteConfig } from "@/lib/site"

const KEY = "uploadcn-stars"

function format(count: number) {
  return count >= 1000
    ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : `${count}`
}

function cachedStars() {
  try {
    const value = sessionStorage.getItem(KEY)
    return value ? Number(value) : null
  } catch {
    return null // storage unavailable (private mode)
  }
}

async function fetchStars(signal: AbortSignal) {
  const response = await fetch(
    `https://api.github.com/repos/${siteConfig.repo}`,
    { signal }
  )
  if (!response.ok) return null
  const repo = (await response.json()) as { stargazers_count?: number }
  if (typeof repo.stargazers_count !== "number") return null
  try {
    sessionStorage.setItem(KEY, String(repo.stargazers_count))
  } catch {
    // storage unavailable (private mode): fetch again next time
  }
  return repo.stargazers_count
}

/**
 * "Star on GitHub" with the live count. The count is fetched in the browser
 * (cached for the session), so pages stay static and cost nothing to serve;
 * without it the button still works.
 */
export function GitHubStars() {
  const [stars, setStars] = React.useState<number | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    const cached = cachedStars()
    const load =
      cached === null ? fetchStars(controller.signal) : Promise.resolve(cached)
    load.then((count) => count !== null && setStars(count)).catch(() => null)
    return () => controller.abort()
  }, [])

  return (
    <a
      href={siteConfig.links.github}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        stars === null
          ? "Star UploadCN on GitHub"
          : `Star UploadCN on GitHub, ${stars} stars`
      }
      className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-current">
        <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
      </svg>
      <span className="hidden sm:inline">Star</span>
      <span className="min-w-[3ch] text-center text-muted-foreground tabular-nums">
        {stars === null ? "" : format(stars)}
      </span>
    </a>
  )
}
