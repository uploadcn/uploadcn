import type { NetworkMonitor } from "./types"

/**
 * Network status from `navigator.onLine` and the `online`/`offline` events.
 * Note: `onLine === true` only means a network interface is up, not that the
 * server is reachable — failed requests are still retried with backoff.
 */
export function createBrowserNetworkMonitor(): NetworkMonitor | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null
  }
  return {
    isOnline: () => navigator.onLine !== false,
    subscribe(listener) {
      const online = () => listener(true)
      const offline = () => listener(false)
      window.addEventListener("online", online)
      window.addEventListener("offline", offline)
      return () => {
        window.removeEventListener("online", online)
        window.removeEventListener("offline", offline)
      }
    },
  }
}
