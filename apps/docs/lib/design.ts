// The site's design system: the same options as shadcn/create, style,
// base color, theme, icon library, font and radius, applied live to every
// component on the site. Encodes to and from shadcn preset codes.

export const STYLES = [
  {
    name: "vega",
    title: "Vega",
    description: "Clean, neutral, and familiar",
    font: "inter",
    iconLibrary: "lucide",
  },
  {
    name: "nova",
    title: "Nova",
    description: "Reduced padding and margins",
    font: "geist",
    iconLibrary: "lucide",
  },
  {
    name: "maia",
    title: "Maia",
    description: "Rounded, with generous spacing",
    font: "figtree",
    iconLibrary: "hugeicons",
  },
  {
    name: "lyra",
    title: "Lyra",
    description: "Boxy and sharp. For mono fonts",
    font: "jetbrains-mono",
    iconLibrary: "phosphor",
  },
  {
    name: "mira",
    title: "Mira",
    description: "Made for compact interfaces",
    font: "inter",
    iconLibrary: "hugeicons",
  },
  {
    name: "luma",
    title: "Luma",
    description: "Fluid, luminous, and soft",
    font: "inter",
    iconLibrary: "lucide",
  },
  {
    name: "sera",
    title: "Sera",
    description: "Editorial and typographic",
    font: "noto-sans",
    iconLibrary: "lucide",
  },
  {
    name: "rhea",
    title: "Rhea",
    description: "A compact Luma",
    font: "inter",
    iconLibrary: "lucide",
  },
] as const

export const BASE_COLORS = [
  "neutral",
  "stone",
  "zinc",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const
export const ACCENTS = [
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
] as const
export const ICON_LIBRARIES = [
  { name: "lucide", title: "Lucide" },
  { name: "tabler", title: "Tabler" },
  { name: "hugeicons", title: "Hugeicons" },
  { name: "phosphor", title: "Phosphor" },
  { name: "remixicon", title: "Remix" },
] as const
/** Fonts the site can preview (loaded with next/font). */
export const FONTS = [
  { name: "geist", title: "Geist" },
  { name: "inter", title: "Inter" },
  { name: "figtree", title: "Figtree" },
  { name: "jetbrains-mono", title: "JetBrains Mono" },
  { name: "noto-sans", title: "Noto Sans" },
  { name: "dm-sans", title: "DM Sans" },
  { name: "outfit", title: "Outfit" },
  { name: "manrope", title: "Manrope" },
] as const
export const RADII = [
  { name: "default", title: "Default" },
  { name: "none", title: "None" },
  { name: "small", title: "Small" },
  { name: "medium", title: "Medium" },
  { name: "large", title: "Large" },
] as const

export type StyleName = (typeof STYLES)[number]["name"]
export type BaseColorName = (typeof BASE_COLORS)[number]
export type ThemeName = BaseColorName | (typeof ACCENTS)[number]
export type IconLibraryName = (typeof ICON_LIBRARIES)[number]["name"]
export type FontName = (typeof FONTS)[number]["name"]
export type RadiusName = (typeof RADII)[number]["name"]

export interface DesignConfig {
  style: StyleName
  baseColor: BaseColorName
  theme: ThemeName
  iconLibrary: IconLibraryName
  font: FontName
  radius: RadiusName
}

export const DEFAULT_DESIGN: DesignConfig = {
  style: "nova",
  baseColor: "neutral",
  theme: "neutral",
  iconLibrary: "lucide",
  font: "geist",
  radius: "default",
}

export const DESIGN_STORAGE_KEY = "uploadcn-design"

const oneOf = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T
): T =>
  typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback

/** Validates anything (storage, a decoded preset) into a usable config. */
export function normalizeDesign(input: unknown): DesignConfig {
  const value = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >
  const baseColor = oneOf(
    value.baseColor,
    BASE_COLORS,
    DEFAULT_DESIGN.baseColor
  )
  return {
    style: oneOf(
      value.style,
      STYLES.map((s) => s.name),
      DEFAULT_DESIGN.style
    ),
    baseColor,
    theme: oneOf(value.theme, [...BASE_COLORS, ...ACCENTS], baseColor),
    iconLibrary: oneOf(
      value.iconLibrary,
      ICON_LIBRARIES.map((i) => i.name),
      DEFAULT_DESIGN.iconLibrary
    ),
    font: oneOf(
      value.font,
      FONTS.map((f) => f.name),
      DEFAULT_DESIGN.font
    ),
    radius: oneOf(
      value.radius,
      RADII.map((r) => r.name),
      DEFAULT_DESIGN.radius
    ),
  }
}

/** Classes and attributes for <html>. Shared by the inline script and React. */
export function designAttributes(config: DesignConfig) {
  const classes = [`style-${config.style}`, `font-preset-${config.font}`]
  // Neutral is the site's own theme (with contrast-tuned tokens), so it
  // needs no class.
  if (config.baseColor !== "neutral")
    classes.push(`theme-base-${config.baseColor}`)
  if (
    config.theme !== config.baseColor &&
    !(BASE_COLORS as readonly string[]).includes(config.theme)
  ) {
    classes.push(`theme-accent-${config.theme}`)
  }
  return {
    classes,
    radius: config.radius === "default" ? null : config.radius,
    iconLibrary: config.iconLibrary,
  }
}

export const DESIGN_CLASS_PREFIXES = [
  "style-",
  "theme-base-",
  "theme-accent-",
  "font-preset-",
]

/**
 * Runs in <head> before first paint, so the saved design never flashes.
 * Must be self-contained: it is serialized with Function.prototype.toString.
 */
export function applyStoredDesignScript(
  key: string,
  prefixes: string[],
  defaults: Record<string, string>,
  baseColors: string[]
) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null") || {}
    const config = Object.assign({}, defaults, stored)
    const html = document.documentElement
    for (const name of Array.from(html.classList)) {
      if (prefixes.some((prefix) => name.indexOf(prefix) === 0))
        html.classList.remove(name)
    }
    html.classList.add("style-" + config.style, "font-preset-" + config.font)
    if (config.baseColor !== "neutral")
      html.classList.add("theme-base-" + config.baseColor)
    if (
      config.theme !== config.baseColor &&
      baseColors.indexOf(config.theme) === -1
    ) {
      html.classList.add("theme-accent-" + config.theme)
    }
    if (config.radius && config.radius !== "default")
      html.dataset.radius = config.radius
    html.dataset.iconLibrary = config.iconLibrary
  } catch {
    // Storage unavailable (private mode, blocked): keep the defaults.
  }
}
