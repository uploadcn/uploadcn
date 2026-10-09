// A minimal npm registry that serves packed @uploadcn/* tarballs, for the
// install tests. Everything else is proxied to the public npm registry by
// the client (only the @uploadcn scope points here).
//
//   node scripts/local-npm-registry.mjs <tarballs-dir> <port>
import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import http from "node:http"
import path from "node:path"
import { gunzipSync } from "node:zlib"

const [dir, port = "4874"] = process.argv.slice(2)
const base = `http://localhost:${port}`

/** Reads one file out of a .tgz (plain ustar, as npm/pnpm pack writes). */
function readFromTarball(bytes, wanted) {
  const tar = gunzipSync(bytes)
  for (let offset = 0; offset + 512 <= tar.length;) {
    const field = tar.toString("utf8", offset, offset + 100)
    const end = field.indexOf("\u0000")
    const name = end === -1 ? field : field.slice(0, end)
    if (!name) break
    const size = parseInt(
      tar.toString("utf8", offset + 124, offset + 136).trim() || "0",
      8
    )
    if (name === wanted)
      return tar.toString("utf8", offset + 512, offset + 512 + size)
    offset += 512 + Math.ceil(size / 512) * 512
  }
  throw new Error(`${wanted} not found`)
}

/** name → { manifest, file } from every tarball in `dir`. */
const packages = new Map()
for (const file of readdirSync(dir).filter((name) => name.endsWith(".tgz"))) {
  const full = path.join(dir, file)
  const bytes = readFileSync(full)
  const manifest = JSON.parse(readFromTarball(bytes, "package/package.json"))
  manifest.dist = {
    tarball: `${base}/tarballs/${file}`,
    shasum: createHash("sha1").update(bytes).digest("hex"),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  }
  packages.set(manifest.name, { manifest, full })
}

http
  .createServer((request, response) => {
    const url = decodeURIComponent(new URL(request.url, base).pathname).slice(1)
    if (url.startsWith("tarballs/")) {
      const entry = [...packages.values()].find((pkg) =>
        pkg.full.endsWith(url.slice("tarballs/".length))
      )
      if (!entry) return response.writeHead(404).end()
      response.writeHead(200, { "content-type": "application/octet-stream" })
      return response.end(readFileSync(entry.full))
    }
    const pkg = packages.get(url)
    if (!pkg) return response.writeHead(404).end()
    const { version } = pkg.manifest
    response.writeHead(200, { "content-type": "application/json" })
    response.end(
      JSON.stringify({
        name: url,
        "dist-tags": { latest: version },
        versions: { [version]: pkg.manifest },
      })
    )
  })
  .listen(Number(port), () => console.log(`listening ${base}`))
