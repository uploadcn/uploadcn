// Generates the per-style CSS for UploadCN from shadcn's own style files.
//
// shadcn/ui authors components with semantic `cn-*` classes (cn-button,
// cn-card…) and defines them once per style (vega, nova, maia…). UploadCN
// does the same with `cn-upload-*` classes, derived here from the closest
// shadcn component, upload items from Item, dropzones from Empty, modals
// from Dialog, so every UploadCN part matches the style it's installed in.
//
// Outputs:
//   registry/styles/style-<name>.css  UploadCN classes (source of truth for
//                                      the registry build and the docs)
//   styles/generated/shadcn-ui.css     shadcn classes for the primitives the
//                                      docs site uses, for live style switching
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { createStyleMap } from "shadcn/utils"

const root = path.resolve(import.meta.dirname, "..")
export const STYLES = [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
]
/** Styles whose components are square: raw radii compile to rounded-none. */
export const SQUARE_STYLES = ["lyra", "sera"]
/** shadcn primitives the docs site uses (and registry blocks import). */
const SITE_PRIMITIVES = [
  "button",
  "input",
  "spinner",
  "badge",
  "field",
  "textarea",
  "separator",
  "label",
  "card",
  "alert",
]

const pick = (classes = "", patterns) =>
  classes
    .split(/\s+/)
    .filter((token) => token && patterns.some((pattern) => pattern.test(token)))
    .join(" ")

function uploadTokens(m) {
  const generous = /\bp-12\b/.test(m["cn-empty"] ?? "")
  const tabsHeight = (m["cn-tabs-list"] ?? "").match(
    /group-data-horizontal\/tabs:(h-\d+)/
  )?.[1]
  return {
    // Dropzone ← Empty
    "cn-upload-dropzone": pick(m["cn-empty"], [/^rounded/]),
    "cn-upload-dropzone-size-sm": generous ? "gap-3 p-5" : "gap-2.5 p-4",
    "cn-upload-dropzone-size-default": generous
      ? "gap-4 px-8 py-12"
      : "gap-3 px-6 py-8",
    "cn-upload-dropzone-size-lg": generous
      ? "gap-5 px-10 py-16"
      : "gap-4 px-8 py-12",
    "cn-upload-dropzone-media-icon": m["cn-empty-media-icon"],
    "cn-upload-dropzone-title": m["cn-empty-title"],
    "cn-upload-dropzone-description": pick(m["cn-empty-description"], [
      /^text-/,
      /^leading/,
    ]),
    // Item ← Item
    "cn-upload-item": pick(m["cn-item"], [/^rounded/, /^text-/]),
    "cn-upload-item-size-default": pick(m["cn-item-size-default"], [
      /^gap-/,
      /^p[xy]?-/,
    ]),
    "cn-upload-item-size-sm": pick(m["cn-item-size-sm"], [/^gap-/, /^p[xy]?-/]),
    "cn-upload-item-size-xs": pick(m["cn-item-size-xs"], [/^gap-/, /^p[xy]?-/]),
    "cn-upload-item-media": pick(m["cn-item-media-variant-image"], [
      /^rounded/,
      /^size-/,
      /^group-data-\[size=/,
    ]).replaceAll("/item:", "/upload-item:"),
    "cn-upload-item-title": pick(m["cn-item-title"], [
      /^text-/,
      /^font-/,
      /^leading/,
      /^uppercase/,
      /^tracking/,
    ]),
    "cn-upload-item-description": pick(m["cn-item-description"], [
      /^text-(xs|sm|base)/,
      /^leading/,
    ]),
    // Progress ← Progress
    "cn-upload-progress": pick(m["cn-progress"], [/^h-/, /^rounded/]),
    // Modal ← Dialog
    "cn-upload-modal": pick(m["cn-dialog-content"], [
      /^rounded/,
      /^ring/,
      /^dark:ring/,
      /^shadow/,
      /^text-(xs|sm|base)/,
    ]),
    "cn-upload-modal-body": pick(m["cn-dialog-content"], [/^gap-/, /^p-\d/]),
    "cn-upload-modal-title": m["cn-dialog-title"],
    "cn-upload-modal-description": m["cn-dialog-description"],
    // Popover ← Popover
    "cn-upload-popover": pick(m["cn-popover-content"], [
      /^rounded/,
      /^ring/,
      /^dark:ring/,
      /^shadow/,
      /^p-\d/,
      /^text-(xs|sm|base)/,
    ]),
    // Tabs ← Tabs
    "cn-upload-tabs-list": [
      pick(m["cn-tabs-list"], [/^rounded/, /^p-/]),
      tabsHeight,
    ]
      .filter(Boolean)
      .join(" "),
    "cn-upload-tabs-trigger": pick(m["cn-tabs-trigger"], [
      /^rounded/,
      /^text-/,
      /^font-/,
    ]),
    // Table ← Table
    "cn-upload-table-head": pick(m["cn-table-head"], [
      /^h-\d/,
      /^px-/,
      /^text-(xs|sm)/,
    ]),
    "cn-upload-table-cell": pick(m["cn-table-cell"], [/^p-/, /^px-/, /^py-/]),
    // Surfaces in blocks ← Card
    "cn-upload-card": [
      pick(m["cn-card"], [
        /^bg-card$/,
        /^text-card-foreground$/,
        /^ring/,
        /^dark:ring/,
        /^rounded/,
        /^shadow/,
        /^text-(xs|sm|base)/,
        /^gap-\(--card-spacing\)$/,
        /^\[--card-spacing:/,
      ]),
      "p-(--card-spacing)",
    ].join(" "),
    "cn-upload-card-title": pick(m["cn-card-title"], [
      /^text-/,
      /^font-/,
      /^leading/,
      /^tracking/,
      /^uppercase/,
    ]),
    "cn-upload-card-description": pick(m["cn-card-description"], [
      /^text-/,
      /^leading/,
    ]),
    "cn-upload-chip": pick(m["cn-badge"], [/^rounded/]),
  }
}

function toCss(style, map, header) {
  const rules = Object.entries(map)
    .filter(([, value]) => value && value.trim())
    .map(([name, value]) => `  .${name} {\n    @apply ${value};\n  }`)
    .join("\n\n")
  return `${header}.style-${style} {\n${rules}\n}\n`
}

const header = (what) =>
  `/* Generated by scripts/gen-styles.mjs from shadcn/ui's style files. ${what} Do not edit. */\n\n`

mkdirSync(path.join(root, "registry/styles"), { recursive: true })
mkdirSync(path.join(root, "styles/generated"), { recursive: true })
let site = header("shadcn primitives used by the docs site.")
for (const style of STYLES) {
  const shadcn = createStyleMap(
    readFileSync(path.join(root, `styles/shadcn/style-${style}.css`), "utf8")
  )
  const tokens = uploadTokens(shadcn)
  const missing = Object.entries(tokens)
    .filter(([, value]) => value === undefined)
    .map(([name]) => name)
  if (missing.length)
    throw new Error(`${style}: no source for ${missing.join(", ")}`)
  writeFileSync(
    path.join(root, `registry/styles/style-${style}.css`),
    toCss(style, tokens, header("UploadCN's classes for this style."))
  )
  const primitives = Object.fromEntries(
    Object.entries(shadcn).filter(([name]) =>
      SITE_PRIMITIVES.some(
        (primitive) =>
          name === `cn-${primitive}` || name.startsWith(`cn-${primitive}-`)
      )
    )
  )
  site += toCss(style, primitives, "") + "\n"
}
writeFileSync(path.join(root, "styles/generated/shadcn-ui.css"), site)
console.log(
  `generated ${STYLES.length} UploadCN styles and the site primitives`
)
