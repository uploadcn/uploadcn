// Security rules for everything users install from the registry.
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import registry from "@/registry.json"

const root = path.resolve(import.meta.dirname, "..")
const files = [
  ...new Set(
    registry.items.flatMap((item) => item.files.map((file) => file.path))
  ),
]
const sources = files.map((file) => ({
  file,
  source: readFileSync(path.join(root, file), "utf8"),
  // Route templates (app/api/*/route.ts) run on the server only.
  server: /^registry\/default\/files\/[\w-]*route[\w-]*\.ts$/.test(file),
}))

const FORBIDDEN: [string, RegExp][] = [
  ["dangerouslySetInnerHTML", /dangerouslySetInnerHTML/],
  ["eval", /\beval\s*\(/],
  ["new Function", /new Function\s*\(/],
  ["innerHTML / outerHTML assignment", /\.(inner|outer)HTML\s*=/],
  ["insertAdjacentHTML", /insertAdjacentHTML/],
  ["document.write", /document\.write/],
  ["javascript: URL", /["'`]javascript:/i],
]

const SECRETS: [string, RegExp][] = [
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Stripe/Cloudinary-style secret", /\b(sk|rk)_(live|test)_[0-9a-zA-Z]{10,}/],
  [
    "hardcoded secret assignment",
    /(secret|password|apiSecret|api_secret)\s*[:=]\s*["'][^"'${}]{8,}["']/i,
  ],
]

describe.each(sources.map((entry) => [entry.file, entry] as const))(
  "%s",
  (_, entry) => {
    it("uses no unsafe DOM or code-execution APIs", () => {
      for (const [label, pattern] of FORBIDDEN) {
        expect(entry.source, label).not.toMatch(pattern)
      }
    })

    it("contains no secrets", () => {
      for (const [label, pattern] of SECRETS) {
        expect(entry.source, label).not.toMatch(pattern)
      }
    })

    it("only links to https URLs", () => {
      const insecure =
        entry.source.match(/["'`]http:\/\/(?!localhost)[^"'`]+/g) ?? []
      expect(insecure).toEqual([])
    })

    it("opens new tabs without leaking window.opener", () => {
      for (const match of entry.source.matchAll(
        /<a\b[^>]*target="_blank"[^>]*>/g
      )) {
        expect(match[0]).toMatch(/rel="[^"]*no(opener|referrer)/)
      }
    })

    it("reads environment variables only on the server", () => {
      if (entry.server) return
      expect(entry.source).not.toMatch(/process\.env\.(?!NODE_ENV)/)
    })
  }
)

describe("server route templates", () => {
  it("read credentials from the environment, never inline", () => {
    for (const entry of sources.filter((source) => source.server)) {
      expect(entry.source).toMatch(/process\.env\./)
      expect(entry.source).not.toMatch(/accessKeyId:\s*["']/)
      expect(entry.source).not.toMatch(/secretAccessKey:\s*["']/)
    }
  })

  it("leave an authorization hook in place", () => {
    for (const entry of sources.filter((source) => source.server)) {
      expect(entry.source).toMatch(/authorize/)
    }
  })
})
