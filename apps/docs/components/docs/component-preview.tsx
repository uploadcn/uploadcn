import { readFile } from "node:fs/promises"
import path from "node:path"

import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc"

import { codeBlockClassName } from "@/components/docs/code"
import { PreviewFrame } from "@/components/docs/preview-frame"
import { codeThemes } from "@/lib/code-themes"
import { ExampleRenderer } from "@/examples/components"
import registry from "@/registry.json"
import { compileStyle, resolveIconsForDisplay } from "@/lib/registry-style"
import { createStyleMap } from "shadcn/utils"

/** Rewrites registry import paths to where `shadcn add` installs files. */
export function toInstalledSource(code: string) {
  return code
    .replaceAll("@/registry/default/ui/", "@/components/ui/")
    .replaceAll("@/registry/default/blocks/", "@/components/")
    .replaceAll("@/registry/default/hooks/", "@/hooks/")
}

// Reads are scoped to known folders so the server bundle only traces them.
function readExample(name: string) {
  return readFile(path.join(process.cwd(), "examples", `${name}.tsx`), "utf8")
}

let novaStyle: Promise<Record<string, string>> | undefined

/**
 * A registry file as `shadcn add` installs it into a default project: the
 * Nova style compiled in and icons from lucide-react.
 */
async function readRegistryFile(filePath: string) {
  const relative = filePath.replace(/^registry\//, "")
  novaStyle ??= readFile(
    path.join(process.cwd(), "registry", "styles", "style-nova.css"),
    "utf8"
  ).then(createStyleMap)
  const source = await readFile(
    path.join(process.cwd(), "registry", relative),
    "utf8"
  )
  return resolveIconsForDisplay(compileStyle(source, await novaStyle, "nova"))
}

/** Live example with its source code. */
export async function ComponentPreview({
  name,
  align,
  className,
}: {
  name: string
  align?: "center" | "start"
  className?: string
}) {
  const code = toInstalledSource(await readExample(name))
  return (
    <PreviewFrame
      align={align}
      className={className}
      source={code}
      href={`/view/${name}`}
      preview={<ExampleRenderer name={name} />}
      code={
        <ServerCodeBlock
          code={code}
          lang="tsx"
          themes={codeThemes}
          codeblock={{
            allowCopy: false,
            className: "my-0 rounded-none border-0 bg-transparent shadow-none",
          }}
        />
      }
    />
  )
}

/** Source of a registry item, for manual installation. */
export async function ComponentSource({ name }: { name: string }) {
  const item = registry.items.find((entry) => entry.name === name)
  if (!item) throw new Error(`Unknown registry item "${name}"`)
  const blocks = await Promise.all(
    item.files.map(async (file) => {
      const code = toInstalledSource(await readRegistryFile(file.path))
      const title =
        "target" in file && file.target
          ? file.target
          : toInstalledSource(`@/${file.path}`)
              .replace("@/registry/default/", "@/")
              .slice(2)
      return (
        <ServerCodeBlock
          key={file.path}
          code={code}
          lang={file.path.endsWith(".ts") ? "ts" : "tsx"}
          themes={codeThemes}
          codeblock={{ title, className: codeBlockClassName }}
        />
      )
    })
  )
  return <div className="not-prose flex flex-col gap-4">{blocks}</div>
}
