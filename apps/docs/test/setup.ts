// Browser APIs happy-dom doesn't implement (or implements partially).
import { afterEach, vi } from "vitest"

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver ??=
  NoopObserver as unknown as typeof IntersectionObserver
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver

// Native <dialog> modal methods.
const dialog = globalThis.HTMLDialogElement?.prototype
if (dialog) {
  dialog.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "")
  }
  dialog.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open")
  }
}

let objectUrls = 0
URL.createObjectURL ??= () => `blob:test/${++objectUrls}`
URL.revokeObjectURL ??= () => {}

afterEach(() => {
  vi.restoreAllMocks()
})

// happy-dom's Web Animations reject `finished` on cancel in ways motion
// doesn't expect outside a browser; motion falls back to JS animations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (Element.prototype as any).animate
