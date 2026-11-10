// The provider config generator, in a real browser: pick each provider,
// type a bucket and origins, and copy what it generates.
import { type Page, expect, test } from "@playwright/test"

import { axeViolations, hydrated } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.goto("/docs/storage/config-generator")
  await hydrated(page, '[data-slot="config-generator"]')
})

const generator = (page: Page) => page.locator('[data-slot="config-generator"]')
const output = (page: Page) => page.locator('[data-slot="config-output"]')
const code = (page: Page, block: string) =>
  output(page).locator(`[data-block="${block}"] pre`)
/** What the last copy put on the clipboard (Windows hands back CRLF). */
const clipboard = async (page: Page) =>
  (await page.evaluate(() => navigator.clipboard.readText())).replace(
    /\r\n/g,
    "\n"
  )

async function choose(page: Page, provider: string) {
  // The radio itself is visually hidden: click its label, like a reader.
  await generator(page).locator("label", { hasText: provider }).click()
  await expect(page.getByRole("radio", { name: provider })).toBeChecked()
  await expect(output(page)).toHaveAttribute(
    "aria-label",
    `${provider} configuration`
  )
}

async function fill(page: Page, bucketLabel = "Bucket name") {
  await page.getByLabel(bucketLabel).fill("acme-uploads")
  await page.getByLabel("Allowed origins").fill("https://app.acme.com")
}

test("Amazon S3: .env, console and CLI CORS, IAM policy", async ({ page }) => {
  await expect(page.getByRole("radio", { name: "Amazon S3" })).toBeChecked()
  await fill(page)

  await expect(code(page, "env")).toContainText("S3_BUCKET=acme-uploads")
  await expect(code(page, "env")).toContainText("S3_SECRET_ACCESS_KEY=")

  // Console: a bare array. CLI: the same rule wrapped in CORSRules.
  const rule = {
    AllowedOrigins: ["https://app.acme.com"],
    AllowedMethods: ["PUT"],
    AllowedHeaders: ["content-type"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  }
  expect(JSON.parse(await code(page, "cors").innerText())).toEqual([rule])
  expect(JSON.parse(await code(page, "cors-cli").innerText())).toEqual({
    CORSRules: [rule],
  })
  await expect(output(page)).toContainText(
    "aws s3api put-bucket-cors --bucket acme-uploads --cors-configuration file://cors.json"
  )
  const policy = JSON.parse(await code(page, "policy").innerText())
  expect(policy.Statement[0].Resource).toBe("arn:aws:s3:::acme-uploads/*")

  await page.getByRole("button", { name: "Copy .env.local" }).click()
  await expect(
    page.getByRole("button", { name: "Copied .env.local" })
  ).toBeVisible()
  expect(await clipboard(page)).toBe(await code(page, "env").innerText())
})

test("Cloudflare R2: dashboard JSON and Wrangler format", async ({ page }) => {
  await choose(page, "Cloudflare R2")
  await fill(page)

  await expect(code(page, "env")).toContainText("R2_BUCKET=acme-uploads")
  await expect(code(page, "env")).toContainText("R2_ACCOUNT_ID=")
  expect(JSON.parse(await code(page, "cors").innerText())).toEqual([
    {
      AllowedOrigins: ["https://app.acme.com"],
      AllowedMethods: ["PUT"],
      AllowedHeaders: ["content-type"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ])
  const wrangler = {
    rules: [
      {
        allowed: {
          origins: ["https://app.acme.com"],
          methods: ["PUT"],
          headers: ["content-type"],
        },
        exposeHeaders: ["ETag"],
        maxAgeSeconds: 3600,
      },
    ],
  }
  expect(JSON.parse(await code(page, "cors-cli").innerText())).toEqual(wrangler)
  await expect(output(page)).toContainText("Object Read & Write")

  await page
    .getByRole("button", { name: "Copy cors.json", exact: true })
    .click()
  expect(JSON.parse(await clipboard(page))).toEqual(wrangler)

  await page.getByRole("button", { name: "Copy cors.json command 1" }).click()
  expect(await clipboard(page)).toBe(
    "npx wrangler r2 bucket cors set acme-uploads --file cors.json"
  )
})

test("Tigris: S3 variables, CORSRules and an IAM policy", async ({ page }) => {
  await choose(page, "Tigris")
  await fill(page)

  await expect(code(page, "env")).toContainText(
    "S3_ENDPOINT=https://t3.storage.dev"
  )
  await expect(code(page, "env")).toContainText("S3_REGION=auto")
  await expect(code(page, "env")).toContainText("S3_BUCKET=acme-uploads")
  const cors = JSON.parse(await code(page, "cors-cli").innerText())
  expect(cors.CORSRules[0].AllowedOrigins).toEqual(["https://app.acme.com"])
  await expect(output(page)).toContainText(
    "aws s3api put-bucket-cors --bucket acme-uploads --endpoint-url https://t3.storage.dev --cors-configuration file://cors.json"
  )

  await page
    .getByRole("button", { name: "Copy policy.json", exact: true })
    .click()
  const policy = JSON.parse(await clipboard(page))
  expect(policy.Version).toBe("2012-10-17")
  expect(policy.Statement[0].Resource).toBe("arn:aws:s3:::acme-uploads/*")
})

test("Cloudinary: preset command, adapter, no CORS", async ({ page }) => {
  await choose(page, "Cloudinary")
  await page.getByLabel("Upload preset name").fill("avatars")

  await expect(code(page, "env")).toContainText(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="
  )
  await expect(code(page, "preset")).toContainText("name=avatars&unsigned=true")
  await expect(code(page, "adapter")).toContainText('uploadPreset: "avatars"')
  await expect(page.getByLabel("Allowed origins")).toBeDisabled()
  await expect(
    output(page).locator('[data-section="cors"] [data-block]')
  ).toHaveCount(0)
  await expect(output(page).locator('[data-section="cors"]')).toContainText(
    "Nothing to configure"
  )

  await page
    .getByRole("button", { name: "Copy Create the preset (Admin API)" })
    .click()
  expect(await clipboard(page)).toContain(
    "https://<API_KEY>:<API_SECRET>@api.cloudinary.com/v1_1/<cloud_name>/upload_presets"
  )
})

test("the output follows the inputs as they are typed", async ({ page }) => {
  await expect(code(page, "cors")).toContainText("https://your-app.com")
  await expect(code(page, "env")).toContainText("S3_BUCKET=my-bucket")

  const origins = page.getByLabel("Allowed origins")
  await origins.pressSequentially("https://app.acme.com")
  await expect(code(page, "cors")).toContainText('"https://app.acme.com"')
  await expect(code(page, "cors")).not.toContainText("your-app.com")

  await origins.pressSequentially(", localhost:3000")
  await expect(code(page, "cors-cli")).toContainText('"http://localhost:3000"')
  await expect(generator(page).getByRole("status")).toContainText(
    'Using http://localhost:3000 for "localhost:3000".'
  )

  await page.getByLabel("Bucket name").pressSequentially("acme")
  await expect(code(page, "env")).toContainText("S3_BUCKET=acme")
  await expect(code(page, "policy")).toContainText("arn:aws:s3:::acme/*")

  // The inputs survive a provider switch.
  await choose(page, "Cloudflare R2")
  await expect(code(page, "env")).toContainText("R2_BUCKET=acme")
  await expect(code(page, "cors-cli")).toContainText("https://app.acme.com")
})

for (const provider of ["Amazon S3", "Cloudflare R2", "Tigris", "Cloudinary"]) {
  test(`${provider}: every block copies, and links to the official docs`, async ({
    page,
  }) => {
    if (provider !== "Amazon S3") await choose(page, provider)

    const blocks = output(page).locator("[data-block]")
    const count = await blocks.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index++) {
      const block = blocks.nth(index)
      await block
        .getByRole("button", { name: /^Copy / })
        .first()
        .click()
      expect(await clipboard(page)).toBe(await block.locator("pre").innerText())
    }

    const links = output(page).locator('a[target="_blank"]')
    expect(await links.count()).toBeGreaterThan(2)
    for (const href of await links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href"))
    ))
      expect(href).toMatch(/^https:\/\//)

    expect(await axeViolations(page, generator(page))).toEqual([])
  })
}

test("a guide's link opens on its provider, and the URL follows", async ({
  page,
}) => {
  await page.goto("/docs/storage/config-generator?provider=tigris")
  await hydrated(page, '[data-slot="config-generator"]')
  await expect(page.getByRole("radio", { name: "Tigris" })).toBeChecked()
  await expect(code(page, "env")).toContainText("S3_REGION=auto")

  await choose(page, "Cloudinary")
  await expect(page).toHaveURL(/\?provider=cloudinary$/)
})

test("adds the local dev origin in one click", async ({ page }) => {
  await page.getByLabel("Allowed origins").fill("https://app.acme.com")
  await page.getByRole("button", { name: "http://localhost:3000" }).click()
  expect(
    JSON.parse(await code(page, "cors").innerText())[0].AllowedOrigins
  ).toEqual(["https://app.acme.com", "http://localhost:3000"])
  await expect(
    page.getByRole("button", { name: "http://localhost:3000" })
  ).toHaveCount(0)
})
