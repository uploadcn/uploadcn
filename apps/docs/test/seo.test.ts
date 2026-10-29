// Share previews: Next merges metadata shallowly, so a page that sets its own
// `openGraph` or `twitter` drops the root layout's share image unless it sets
// `images` too. Pages should use shareMetadata() from lib/seo.ts.
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { shareMetadata, siteImage } from "@/lib/seo"

const app = path.resolve(import.meta.dirname, "../app")

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return /^(page|layout)\.tsx?$/.test(name) ? [full] : []
  })

const files = walk(app).map((file) => ({
  file: path.relative(app, file).replaceAll("\\", "/"),
  text: readFileSync(file, "utf8"),
}))

describe("share metadata", () => {
  it.each(files.filter(({ text }) => /\b(openGraph|twitter):/.test(text)))(
    "$file sets a share image wherever it sets openGraph or twitter",
    ({ text }) => {
      expect(text).toMatch(/\bimages:/)
    }
  )

  it("shareMetadata always includes the image and a large card", () => {
    const meta = shareMetadata({ title: "T", description: "D", url: "/x" })
    expect(meta.openGraph.images).toEqual([siteImage])
    expect(meta.twitter.images).toEqual([siteImage])
    expect(meta.twitter.card).toBe("summary_large_image")
    expect(meta.openGraph.url).toBe("/x")
  })

  it("the share image file exists at the size it claims", () => {
    const png = readFileSync(path.join(app, "opengraph-image.png"))
    expect(siteImage.url).toBe("/opengraph-image.png")
    expect(png.readUInt32BE(16)).toBe(siteImage.width)
    expect(png.readUInt32BE(20)).toBe(siteImage.height)
  })
})
