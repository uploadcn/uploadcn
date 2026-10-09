import pluginReactHooks from "eslint-plugin-react-hooks"
import { defineConfig } from "eslint/config"
import globals from "globals"

import { config as baseConfig } from "./base.js"

/**
 * ESLint configuration for React libraries.
 */
export const config = defineConfig([
  baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  pluginReactHooks.configs.flat.recommended,
])
