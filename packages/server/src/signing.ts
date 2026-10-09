const encoder = new TextEncoder()

export function toBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function hmac(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return toBase64Url(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
    )
  )
}

/** Constant-time comparison for signatures. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

export interface UrlToken {
  key: string
  method: "PUT" | "GET"
  /** Expected body size for single PUTs. */
  size?: number
  uploadId?: string
  partNumber?: number
  expires: number
}

/** Signs and verifies short-lived URL tokens with an HMAC secret. */
export function createUrlSigner(secret: string, baseUrl: string) {
  if (!secret) throw new Error("A signing secret is required")
  const base = baseUrl.replace(/\/+$/, "")
  return {
    base,
    async sign(token: UrlToken) {
      const payload = toBase64Url(encoder.encode(JSON.stringify(token)))
      return `${base}?token=${payload}.${await hmac(secret, payload)}`
    },
    async verify(raw: string | null): Promise<UrlToken | null> {
      if (!raw) return null
      const [payload, signature] = raw.split(".")
      if (!payload || !signature) return null
      if (!safeEqual(await hmac(secret, payload), signature)) return null
      const token = JSON.parse(
        new TextDecoder().decode(fromBase64Url(payload))
      ) as UrlToken
      return token.expires > Date.now() ? token : null
    },
  }
}

export async function sha256Hex(bytes: ArrayBuffer, length = 16) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  return [...hash.slice(0, length)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
