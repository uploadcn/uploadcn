import { plugin as shadcn } from "@shadcn/lint"
import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  // Registry build scratch: written and deleted while `registry:build` runs.
  { ignores: [".registry-build/**"] },
  {
    // Design-system rules for everything users install or copy: components
    // must use theme tokens so they work with every shadcn theme.
    files: ["registry/**/*.{ts,tsx}", "examples/**/*.{ts,tsx}"],
    plugins: { shadcn },
    settings: {
      shadcn: {
        componentImports: ["^@/registry/default/ui(/|$)"],
        note: "Registry components must work with every shadcn theme: use theme tokens (bg-primary, text-muted-foreground, …).",
      },
    },
    rules: {
      "shadcn/no-raw-colors": "error",
      "shadcn/no-unknown-classes": "error",
      "shadcn/no-arbitrary-values": [
        "error",
        {
          // Motion and layout details with no scale equivalent. Colors and
          // spacing still have to come from the theme.
          allow: [
            "transition-[*]",
            "rounded-[inherit]",
            "rounded-[28%]",
            "[perspective:*]",
            "*:[transform:*]",
            "[scrollbar-width:none]",
            "grid-cols-[*]",
            "w-[200%]",
            "h-[1em]",
            "w-[0.62em]",
            "aspect-[1.586]",
          ],
        },
      ],
      "shadcn/require-static-classes": "error",
    },
  },
]
