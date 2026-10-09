// Compiles UploadCN's `cn-upload-*` style classes into plain Tailwind
// classes for one shadcn style, the same idea as shadcn's own registry
// build. Used by scripts/build-registry.mts and by the docs' code view.

export const STYLE_NAMES = [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const
export type StyleName = (typeof STYLE_NAMES)[number]
export const BASES = ["base", "radix", "aria"] as const

/** Styles whose components are square (shadcn uses rounded-none throughout). */
const SQUARE_STYLES = new Set<string>(["lyra", "sera"])

const TOKEN = /cn-upload-[a-z0-9-]+/g
const RADIUS =
  /(^|[\s:])rounded(-[tblrsexy]{1,2})?-(?:xs|sm|md|lg|xl|2xl|3xl|4xl)(?=$|\s)/g

/** Compiles every string literal in `source` that contains class tokens. */
export function compileStyle(
  source: string,
  styleMap: Record<string, string>,
  style: string
) {
  const square = SQUARE_STYLES.has(style)
  return source.replace(/"([^"\n]*)"/g, (literal, body: string) => {
    let next = body
    if (next.includes("cn-upload-")) {
      next = next.replace(TOKEN, (token) => styleMap[token] ?? "")
    }
    if (square && /\brounded-/.test(next)) {
      next = next.replace(
        RADIUS,
        (_, lead: string, side = "") => `${lead}rounded${side}-none`
      )
    }
    if (next === body) return literal
    return `"${next.replace(/\s+/g, " ").trim()}"`
  })
}

/** Returns the `cn-upload-*` tokens left in compiled source (should be none). */
export function findStyleTokens(source: string) {
  return [...new Set(source.match(TOKEN) ?? [])]
}

/**
 * For displaying code: resolves <IconPlaceholder> to lucide-react, which is
 * what the shadcn CLI writes for the default icon library.
 */
export function resolveIconsForDisplay(source: string) {
  if (!source.includes("IconPlaceholder")) return source
  const used = new Set<string>()
  let code = source.replace(
    /<IconPlaceholder\b([\s\S]*?)\/>/g,
    (_, attributes: string) => {
      const name = attributes.match(/\blucide="([^"]+)"/)?.[1] ?? "CircleIcon"
      used.add(name)
      const rest = attributes
        .replace(
          /\s*\b(lucide|tabler|hugeicons|phosphor|remixicon)="[^"]*"/g,
          ""
        )
        .trim()
      return rest ? `<${name} ${rest} />` : `<${name} />`
    }
  )
  code = code.replace(
    /import \{ IconPlaceholder \} from "[^"]*icon-placeholder"\n/,
    `import { ${[...used].sort().join(", ")} } from "lucide-react"\n`
  )
  return code
}
