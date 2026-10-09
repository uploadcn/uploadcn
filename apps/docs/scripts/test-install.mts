// Installs every UploadCN item into fresh shadcn projects, across bases,
// styles and icon libraries, and checks the result type-checks.
//
//   pnpm --filter docs test:install            (needs the docs site running)
//   REGISTRY_URL=http://localhost:3123 KEEP=1 pnpm --filter docs test:install
//
// @uploadcn/* resolve to freshly packed tarballs served by a local npm
// registry (scripts/local-npm-registry.mjs), so the packages under test are
// exactly the ones in this repo.
import { execFileSync, spawn } from "node:child_process"
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"

import { encodePreset } from "shadcn/preset"

const docs = path.resolve(import.meta.dirname, "..")
const repo = path.resolve(docs, "../..")
const registryUrl = process.env.REGISTRY_URL ?? "http://localhost:3123"
const workdir = path.join(os.tmpdir(), "uploadcn-install-matrix")
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm"

// Files UploadCN ships. Type errors elsewhere come from shadcn's own
// components (e.g. its Hugeicons spinner) and are reported, not failed.
const OWN_FILES = new Set(
  (
    JSON.parse(readFileSync(path.join(docs, "registry.json"), "utf8")) as {
      items: { files: { path: string }[] }[]
    }
  ).items.flatMap((item) => item.files.map((file) => path.basename(file.path)))
)

const MATRIX = [
  {
    base: "base",
    style: "nova",
    iconLibrary: "lucide",
    package: "lucide-react",
  },
  {
    base: "radix",
    style: "lyra",
    iconLibrary: "phosphor",
    package: "@phosphor-icons/react",
  },
  {
    base: "aria",
    style: "maia",
    iconLibrary: "hugeicons",
    package: "@hugeicons/core-free-icons",
  },
  {
    base: "base",
    style: "sera",
    iconLibrary: "tabler",
    package: "@tabler/icons-react",
  },
  {
    base: "radix",
    style: "mira",
    iconLibrary: "remixicon",
    package: "@remixicon/react",
  },
] as const

const registry = JSON.parse(
  readFileSync(path.join(docs, "registry.json"), "utf8")
)
const items: string[] = registry.items
  .map((item: { name: string }) => item.name)
  .filter((name: string) => name !== "upload-route-tanstack")

function run(command: string, args: string[], cwd: string) {
  return execFileSync(command, args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, CI: "1" },
  })
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (/\.tsx?$/.test(entry)) yield full
  }
}

rmSync(workdir, { recursive: true, force: true })
mkdirSync(path.join(workdir, "tarballs"), { recursive: true })
for (const pkg of ["core", "react", "server"]) {
  run(
    pnpm,
    ["pack", "--pack-destination", path.join(workdir, "tarballs")],
    path.join(repo, "packages", pkg)
  )
}
const npmPort = "4874"
const npmRegistry = spawn(
  process.execPath,
  [
    path.join(docs, "scripts/local-npm-registry.mjs"),
    path.join(workdir, "tarballs"),
    npmPort,
  ],
  { stdio: ["ignore", "pipe", "inherit"] }
)
await new Promise<void>((resolve, reject) => {
  npmRegistry.stdout.once("data", () => resolve())
  npmRegistry.once("exit", (code) =>
    reject(new Error(`npm registry exited ${code}`))
  )
})

const failures: string[] = []
for (const target of MATRIX) {
  const name = `${target.base}-${target.style}-${target.iconLibrary}`
  const label = `${target.base} × ${target.style} × ${target.iconLibrary}`
  const project = path.join(workdir, name)
  try {
    const preset = encodePreset({
      style: target.style,
      iconLibrary: target.iconLibrary,
    })
    // pnpm dlx makes init create a pnpm project, so pnpm overrides apply.
    run(
      pnpm,
      [
        "dlx",
        "shadcn@latest",
        "init",
        "-t",
        "next",
        "-b",
        target.base,
        "--preset",
        preset,
        "-n",
        name,
        "-y",
        "--no-monorepo",
      ],
      workdir
    )

    // Resolve the @uploadcn scope from the local registry.
    writeFileSync(
      path.join(project, ".npmrc"),
      `@uploadcn:registry=http://localhost:${npmPort}/
`
    )

    const configPath = path.join(project, "components.json")
    const config = JSON.parse(readFileSync(configPath, "utf8"))
    if (config.style !== `${target.base}-${target.style}`) {
      throw new Error(`init produced style ${config.style}`)
    }
    if (config.iconLibrary !== target.iconLibrary) {
      throw new Error(`init produced icon library ${config.iconLibrary}`)
    }
    config.registries = { "@uploadcn": `${registryUrl}/r/{style}/{name}.json` }
    writeFileSync(configPath, JSON.stringify(config, null, 2))

    run(
      pnpm,
      [
        "dlx",
        "shadcn@latest",
        "add",
        ...items.map((item) => `@uploadcn/${item}`),
        "-y",
        "-o",
      ],
      project
    )

    const problems: string[] = []
    const upload = readFileSync(
      path.join(project, "components/ui/upload.tsx"),
      "utf8"
    )
    const square = target.style === "lyra" || target.style === "sera"
    if (square && /rounded-(lg|xl|2xl)\b/.test(upload))
      problems.push("not square")
    if (target.style === "maia" && !/rounded-2xl/.test(upload))
      problems.push("not maia")
    for (const file of walk(path.join(project, "components"))) {
      const source = readFileSync(file, "utf8")
      const relative = path.relative(project, file)
      if (source.includes("cn-upload-"))
        problems.push(`${relative}: style tokens left`)
      if (source.includes("IconPlaceholder"))
        problems.push(`${relative}: IconPlaceholder left`)
      if (
        target.package !== "lucide-react" &&
        /from ["']lucide-react["']/.test(source) &&
        !relative.includes(`${path.sep}ui${path.sep}`)
      ) {
        problems.push(`${relative}: imports lucide-react`)
      }
    }
    if (
      !readFileSync(
        path.join(project, "components/ui/upload.tsx"),
        "utf8"
      ).includes(target.package)
    ) {
      problems.push(`upload.tsx doesn't import ${target.package}`)
    }
    try {
      run(pnpm, ["exec", "tsc", "--noEmit"], project)
    } catch (error) {
      const output = String((error as { stdout?: string }).stdout ?? error)
      const errors = output
        .split("\n")
        .filter((line) => line.includes("error TS"))
      const ours = errors.filter((line) =>
        OWN_FILES.has(path.basename(line.split("(")[0]!.trim()))
      )
      const upstream = errors.length - ours.length
      if (upstream) {
        console.log(
          `  note: ${upstream} type error(s) in shadcn's own files for ${label}`
        )
      }
      if (ours.length) problems.push(`tsc: ${ours.slice(0, 5).join(" | ")}`)
    }
    if (problems.length) throw new Error(problems.join("\n    "))
    console.log(`PASS  ${label}`)
  } catch (error) {
    failures.push(label)
    console.log(
      `FAIL  ${label}\n    ${String((error as Error).message)
        .split("\n")
        .slice(0, 8)
        .join("\n    ")}`
    )
  }
}

npmRegistry.kill()
if (!process.env.KEEP) rmSync(workdir, { recursive: true, force: true })
console.log(
  `${MATRIX.length - failures.length}/${MATRIX.length} install targets passed`
)
process.exit(failures.length ? 1 : 0)
