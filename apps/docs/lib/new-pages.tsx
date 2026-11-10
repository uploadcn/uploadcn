import type { Node, Root } from "fumadocs-core/page-tree"

/**
 * Pages that get a "new" dot in the sidebar, like the shadcn/ui docs. Add a
 * page's URL when it ships and remove it a release or two later.
 */
export const NEW_PAGES = new Set([
  "/docs/changelog",
  "/docs/components/upload-paste",
  "/docs/storage/config-generator",
])

function NewLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate">{children}</span>
      <span
        aria-hidden
        data-slot="new-dot"
        className="size-1.5 shrink-0 rounded-full bg-blue-500"
      />
      <span className="sr-only">(new)</span>
    </span>
  )
}

function mark(node: Node): Node {
  if (node.type === "page") {
    return NEW_PAGES.has(node.url)
      ? { ...node, name: <NewLabel>{node.name}</NewLabel> }
      : node
  }
  if (node.type === "folder") {
    return {
      ...node,
      index: node.index ? (mark(node.index) as typeof node.index) : undefined,
      children: node.children.map(mark),
    }
  }
  return node
}

/**
 * The page tree for the sidebar, with new pages marked. The tree from
 * `source` is left alone: search, breadcrumbs and the pager read plain names
 * from it.
 */
export function withNewDots(tree: Root): Root {
  return { ...tree, children: tree.children.map(mark) }
}
