"use client"

import * as React from "react"

import { useDesign } from "@/components/design/use-design"
import { icons as lucide } from "@/components/icons/lucide"

type Library = "lucide" | "tabler" | "hugeicons" | "phosphor" | "remixicon"
type IconNames = Record<Library, string>
type Icons = Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>

type IconPlaceholderProps = IconNames &
  Omit<React.SVGProps<SVGSVGElement>, keyof IconNames | "ref">

/** Lucide ships with the page; the other libraries load when chosen. */
const loaders: Record<
  Exclude<Library, "lucide">,
  () => Promise<{ icons: object }>
> = {
  tabler: () => import("@/components/icons/tabler"),
  hugeicons: () => import("@/components/icons/hugeicons"),
  phosphor: () => import("@/components/icons/phosphor"),
  remixicon: () => import("@/components/icons/remixicon"),
}

const loaded: Partial<Record<Library, Icons>> = { lucide: lucide as Icons }
const loading = new Set<Library>()
const listeners = new Set<() => void>()

function load(library: Library) {
  if (library === "lucide" || loaded[library] || loading.has(library)) return
  loading.add(library)
  void loaders[library]()
    .then((module) => {
      loaded[library] = module.icons as Icons
      for (const listener of listeners) listener()
    })
    .finally(() => loading.delete(library))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The icons of a library, or `undefined` while it downloads. */
function useIcons(library: Library) {
  const icons = React.useSyncExternalStore(
    subscribe,
    () => loaded[library],
    () => (library === "lucide" ? loaded.lucide : undefined)
  )
  React.useEffect(() => load(library), [library])
  return icons
}

/**
 * One icon, in every icon library shadcn supports. In your project the
 * shadcn CLI replaces it with an import from your `iconLibrary` on install;
 * on this site it renders the library selected in Customize (Lucide until
 * another library finishes loading).
 */
export function IconPlaceholder({
  lucide: lucideName,
  tabler,
  hugeicons,
  phosphor,
  remixicon,
  ...props
}: IconPlaceholderProps) {
  const { iconLibrary } = useDesign()
  const names: IconNames = {
    lucide: lucideName,
    tabler,
    hugeicons,
    phosphor,
    remixicon,
  }
  const icons = useIcons(iconLibrary as Library)
  const Icon =
    icons?.[names[iconLibrary as Library]] ?? (lucide as Icons)[lucideName]
  return Icon ? <Icon {...props} /> : null
}
