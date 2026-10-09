import type { Transport, TransportRequest } from "../src/adapters/transport"
import type {
  NetworkMonitor,
  UploadAdapter,
  UploadAdapterContext,
} from "../src/types"

export function createFile(
  name = "file.txt",
  size = 1000,
  type = "text/plain"
) {
  return new File([new Uint8Array(size)], name, { type, lastModified: 1 })
}

export interface ControlledCall {
  context: UploadAdapterContext
  settled: boolean
  resolve(value?: unknown): void
  reject(error: unknown): void
}

/**
 * An adapter whose uploads stay pending until the test resolves or rejects
 * them, so every intermediate state can be asserted.
 */
export function controlledAdapter(options: { resumable?: boolean } = {}) {
  const calls: ControlledCall[] = []
  const aborted: unknown[] = []
  const adapter: UploadAdapter = {
    name: "controlled",
    resumable: options.resumable ?? false,
    upload(context) {
      return new Promise((resolve, reject) => {
        const call: ControlledCall = {
          context,
          settled: false,
          resolve(value) {
            call.settled = true
            resolve(value)
          },
          reject(error) {
            call.settled = true
            reject(error)
          },
        }
        calls.push(call)
        context.signal.addEventListener("abort", () =>
          call.reject(
            Object.assign(new Error("aborted"), { name: "AbortError" })
          )
        )
      })
    },
    async abort({ resumeState }) {
      aborted.push(resumeState)
    },
  }
  return {
    adapter,
    calls,
    aborted,
    active: () => calls.filter((call) => !call.settled),
    last: () => calls.at(-1)!,
  }
}

export function fakeNetwork(initial = true) {
  let online = initial
  const listeners = new Set<(online: boolean) => void>()
  const monitor: NetworkMonitor = {
    isOnline: () => online,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    monitor,
    set(value: boolean) {
      online = value
      for (const listener of listeners) listener(value)
    },
  }
}

export interface RecordedRequest extends TransportRequest {
  respond(status: number, body?: string, headers?: Record<string, string>): void
  fail(error: unknown): void
}

/** A transport that records requests and lets the test answer them. */
export function fakeTransport(
  auto?: (request: TransportRequest) => {
    status: number
    body?: string
    headers?: Record<string, string>
  }
) {
  const requests: RecordedRequest[] = []
  const transport: Transport = (request) =>
    new Promise((resolve, reject) => {
      const recorded: RecordedRequest = {
        ...request,
        respond(status, body = "", headers = {}) {
          resolve({ status, body, headers: new Headers(headers) })
        },
        fail: reject,
      }
      requests.push(recorded)
      request.signal?.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
      )
      if (auto) {
        const size = request.body instanceof Blob ? request.body.size : 100
        request.onUploadProgress?.(size, size)
        const response = auto(request)
        recorded.respond(response.status, response.body, response.headers)
      }
    })
  return { transport, requests }
}

export const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
