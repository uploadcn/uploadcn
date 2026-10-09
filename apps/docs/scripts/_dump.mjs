import { readFileSync } from "node:fs"
const { createStyleMap } = await import("shadcn/utils")
const dir = process.argv[2]
const keys = process.argv.slice(3)
for (const s of [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
]) {
  const map = createStyleMap(readFileSync(`${dir}/style-${s}.css`, "utf8"))
  console.log(`##### ${s} (${Object.keys(map).length} classes)`)
  for (const key of keys)
    console.log(key.padEnd(26), (map[key] ?? "-").slice(0, 260))
}
