// Standards every registry item must meet. Generated per item, so a new
// component is covered as soon as it's added to registry.json.
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { createStyleMap } from "shadcn/utils"
import { describe, expect, it } from "vitest"

import { examples } from "@/examples/meta"
import {
  compileStyle,
  findStyleTokens,
  STYLE_NAMES,
} from "@/lib/registry-style"
import registry from "@/registry.json"

const root = path.resolve(import.meta.dirname, "..")
const read = (file: string) => readFileSync(path.join(root, file), "utf8")
const items = registry.items
const names = new Set(items.map((item) => item.name))

/** shadcn/ui components a registry item may depend on. */
const SHADCN_UI = new Set([
  "alert",
  "badge",
  "button",
  "card",
  "field",
  "input",
  "label",
  "separator",
  "spinner",
  "textarea",
])
const ALLOWED_NPM = new Set([
  "@uploadcn/core",
  "@uploadcn/react",
  "@uploadcn/server",
  "@tanstack/react-router",
  "class-variance-authority",
  "cn",
  "motion",
  "react-easy-crop",
])

function importsOf(source: string) {
  const npm = new Set<string>()
  const registryDeps = new Set<string>()
  for (const [, spec = ""] of source.matchAll(/from "([^"]+)"/g)) {
    const ui = spec.match(/^@\/components\/ui\/(.+)$/)
    const own = spec.match(/^@\/registry\/default\/(?:ui|hooks|blocks)\/(.+)$/)
    if (ui) registryDeps.add(ui[1]!)
    else if (own) registryDeps.add(`@uploadcn/${own[1]}`)
    else if (/^(@\/|\.|node:|react$|react-dom|next)/.test(spec)) continue
    else
      npm.add(
        spec.startsWith("@")
          ? spec.split("/").slice(0, 2).join("/")
          : spec.split("/")[0]!
      )
  }
  return { npm, registryDeps }
}

const styleMaps = Object.fromEntries(
  STYLE_NAMES.map((style) => [
    style,
    createStyleMap(read(`registry/styles/style-${style}.css`)),
  ])
)

describe("registry.json", () => {
  it("meets the shadcn registry directory rules", () => {
    expect(registry.name).toBe("uploadcn")
    expect(registry.homepage).toMatch(/^https:\/\//)
    for (const item of items) {
      for (const file of item.files) {
        // No inline content in the index; files are referenced by path.
        expect(file).not.toHaveProperty("content")
      }
    }
  })

  it("has unique, kebab-case names", () => {
    expect(names.size).toBe(items.length)
    for (const item of items)
      expect(item.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})

describe.each(items.map((item) => [item.name, item] as const))(
  "%s",
  (name, item) => {
    const sources = item.files.map((file) => ({
      file,
      source: read(file.path),
    }))

    it("has a title, a useful description and categories", () => {
      expect(item.title.length).toBeGreaterThan(2)
      expect(item.description.length).toBeGreaterThanOrEqual(30)
      expect(item.description).toMatch(/[.!]$/)
      expect(item.categories?.length ?? 0).toBeGreaterThan(0)
    })

    it("declares exactly the packages and registry items it imports", () => {
      if (name === "upload-route-tanstack") return // framework file, deps are the app's
      const npm = new Set<string>()
      const registryDeps = new Set<string>()
      const ownFiles = new Set(
        item.files.map((file) =>
          path.basename(file.path).replace(/\.tsx?$/, "")
        )
      )
      for (const { source } of sources) {
        const found = importsOf(source)
        found.npm.forEach((dep) => npm.add(dep))
        found.registryDeps.forEach((dep) => {
          if (!ownFiles.has(dep.replace("@uploadcn/", "")))
            registryDeps.add(dep)
        })
      }
      const declaredNpm = (item.dependencies ?? []).map((dep) =>
        dep.replace(/@[\^~\d][^@]*$/, "")
      )
      expect(new Set(declaredNpm)).toEqual(npm)
      expect(new Set(item.registryDependencies ?? [])).toEqual(registryDeps)
      for (const dep of npm)
        expect(ALLOWED_NPM, `unexpected dependency ${dep}`).toContain(dep)
      for (const dep of registryDeps) {
        if (dep.startsWith("@uploadcn/"))
          expect(names).toContain(dep.replace("@uploadcn/", ""))
        else expect(SHADCN_UI, `unknown shadcn component ${dep}`).toContain(dep)
      }
    })

    it("pins UploadCN packages to a compatible range", () => {
      for (const dep of item.dependencies ?? []) {
        if (dep.startsWith("@uploadcn/"))
          expect(dep).toMatch(/@\^\d+\.\d+\.\d+$/)
      }
    })

    it("compiles for every shadcn style with no style classes left", () => {
      for (const { file, source } of sources) {
        for (const style of STYLE_NAMES) {
          const compiled = compileStyle(source, styleMaps[style]!, style)
          expect(findStyleTokens(compiled), `${style}: ${file.path}`).toEqual(
            []
          )
          if (style === "lyra" || style === "sera") {
            expect(compiled, `${style} should be square`).not.toMatch(
              /(^|[\s":])rounded(-[tblrsexy]{1,2})?-(xs|sm|md|lg|xl|2xl|3xl|4xl)(?=[\s"])/
            )
          }
        }
      }
    })

    it("uses only style classes that every style defines", () => {
      for (const { source } of sources) {
        for (const token of findStyleTokens(source)) {
          const definedIn = STYLE_NAMES.filter(
            (style) => token in styleMaps[style]!
          )
          // Sera has no dropzone radius on purpose; anything else is a typo.
          expect(definedIn.length, token).toBeGreaterThanOrEqual(
            STYLE_NAMES.length - 1
          )
        }
      }
    })

    if (item.type === "registry:block") {
      it("has a docs page and a live example", () => {
        expect(
          existsSync(path.join(root, `content/docs/components/${name}.mdx`))
        ).toBe(true)
        expect(
          examples.some(
            (example) => example.href === `/docs/components/${name}`
          )
        ).toBe(true)
      })

      it("lets apps choose storage (adapter prop or UploadConfigProvider)", () => {
        const source = sources.map(({ source }) => source).join("\n")
        if (name === "upload-confetti") return // a part inside <Upload>, not an uploader
        expect(source).toMatch(/adapter\?: UploadAdapter<TResult>/)
        // No hidden network defaults: the adapter comes from props or the provider.
        expect(source).not.toMatch(/s3Adapter\(\{ endpoint/)
      })
    }
  }
)

describe("generated files", () => {
  it("style CSS is up to date with the generator", async () => {
    const { execFileSync } = await import("node:child_process")
    const before = STYLE_NAMES.map((style) =>
      read(`registry/styles/style-${style}.css`)
    )
    execFileSync(
      process.execPath,
      [path.join(root, "scripts/gen-styles.mjs")],
      { cwd: root }
    )
    const after = STYLE_NAMES.map((style) =>
      read(`registry/styles/style-${style}.css`)
    )
    expect(after).toEqual(before)
  })

  it.runIf(existsSync(path.join(root, "public/r/registry.json")))(
    "the built registry has every item for every style, plus an index",
    () => {
      for (const dir of [
        "",
        ...STYLE_NAMES.map((style) => `styles/${style}/`),
      ]) {
        expect(
          existsSync(path.join(root, `public/r/${dir}registry.json`)),
          dir
        ).toBe(true)
        for (const item of items) {
          const built = JSON.parse(read(`public/r/${dir}${item.name}.json`))
          expect(built.name).toBe(item.name)
          for (const file of built.files) {
            expect(findStyleTokens(file.content), `${dir}${item.name}`).toEqual(
              []
            )
          }
        }
      }
    }
  )
})
