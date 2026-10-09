// Builds the UploadCN registry for every shadcn style.
//
//   public/r/<name>.json                 nova (default for `{name}` URLs)
//   public/r/styles/<style>/<name>.json  one folder per style
//
// `{style}` URLs like /r/base-lyra/upload.json are rewritten to
// /r/styles/lyra/upload.json in next.config.mjs: UploadCN components work
// on every base (Radix, Base UI, React Aria), so only the style matters.
import { execFileSync } from "node:child_process"
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

import { createStyleMap } from "shadcn/utils"

import {
  compileStyle,
  findStyleTokens,
  STYLE_NAMES,
} from "../lib/registry-style.ts"

const root = path.resolve(import.meta.dirname, "..")
const work = path.join(root, ".registry-build")
const output = path.join(root, "public/r")
// Run the CLI with Node directly: no shell, so nothing to escape.
const shadcn = path.join(root, "node_modules/shadcn/dist/index.js")

const registry = JSON.parse(
  readFileSync(path.join(root, "registry.json"), "utf8")
)
const files: string[] = [
  ...new Set<string>(
    registry.items.flatMap((item: { files: { path: string }[] }) =>
      item.files.map((file) => file.path)
    )
  ),
]

rmSync(work, { recursive: true, force: true })
rmSync(output, { recursive: true, force: true })

for (const style of STYLE_NAMES) {
  const styleMap = createStyleMap(
    readFileSync(path.join(root, `registry/styles/style-${style}.css`), "utf8")
  )
  const dir = path.join(work, style)
  for (const file of files) {
    const compiled = compileStyle(
      readFileSync(path.join(root, file), "utf8"),
      styleMap,
      style
    )
    const leftover = findStyleTokens(compiled)
    if (leftover.length) {
      throw new Error(`${style}: ${file} still has ${leftover.join(", ")}`)
    }
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    writeFileSync(path.join(dir, file), compiled)
  }
  writeFileSync(
    path.join(dir, "registry.json"),
    JSON.stringify(registry, null, 2)
  )
  const out = path.join(output, "styles", style)
  execFileSync(
    process.execPath,
    [shadcn, "build", "registry.json", "--output", out, "--cwd", dir],
    { stdio: "pipe" }
  )
  if (style === "nova") cpSync(out, output, { recursive: true })
  console.log(`✓ ${style}`)
}
rmSync(work, { recursive: true, force: true })
console.log(
  `Built ${registry.items.length} items × ${STYLE_NAMES.length} styles`
)
