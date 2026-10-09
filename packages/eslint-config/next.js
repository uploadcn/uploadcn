import pluginNext from "@next/eslint-plugin-next"
import pluginReactHooks from "eslint-plugin-react-hooks"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"

import { config as baseConfig } from "./base.js"

/**
 * ESLint configuration for Next.js applications.
 */
export const nextJsConfig = defineConfig([
  baseConfig,
  globalIgnores(["out/**", "build/**", "next-env.d.ts", "public/r/**"]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },
  pluginReactHooks.configs.flat.recommended,
])
