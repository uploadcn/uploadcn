import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "browser",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  deps: { neverBundle: ["react", "react/jsx-runtime", "@uploadcn/core"] },
  // Every export is a hook or a client component.
  banner: { js: '"use client";' },
})
