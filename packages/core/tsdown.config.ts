import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts", "src/image.ts", "src/tus.ts"],
  format: "esm",
  platform: "browser",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
})
