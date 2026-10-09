import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts", "src/fs.ts", "src/scan.ts", "src/ocr.ts"],
  format: "esm",
  platform: "neutral",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  deps: { neverBundle: ["@uploadcn/core", "aws4fetch", /^node:/] },
})
