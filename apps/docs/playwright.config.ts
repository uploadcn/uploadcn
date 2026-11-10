import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests for the docs site (`pnpm --filter docs test:e2e`).
 *
 * By default they run against a production build served by `next start`,
 * so run `pnpm build` first. To use a server that is already running (for
 * example `pnpm dev`), set E2E_BASE_URL=http://localhost:3000.
 */
const port = Number(process.env.E2E_PORT ?? 3210)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // The tests read back what the copy buttons wrote, and put a real
        // image on the clipboard for a real Ctrl+V.
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next start -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
