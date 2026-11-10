// Paste to upload, in a real browser: /view/paste-upload renders the
// FileUpload block (accept="image/*", maxFiles={6}) with the docs' simulated
// storage.
import { type Page, expect, test } from "@playwright/test"

import {
  PNG_BASE64,
  axeViolations,
  hydrated,
  pasteFiles,
  screenshot,
} from "./helpers"

const PASTED_NAME = /^pasted-image-\d{8}-\d{6}(-\d+)?\.png$/

test.beforeEach(async ({ page }) => {
  await page.goto("/view/paste-upload")
  await hydrated(page, '[data-slot="upload-dropzone"]')
})

const dropzone = (page: Page) => page.locator('[data-slot="upload-dropzone"]')
const items = (page: Page) => page.locator('[data-slot="upload-item"]')

test("shows the paste shortcut in the dropzone", async ({ page }) => {
  await expect(dropzone(page)).toHaveAttribute("data-paste", "")
  await expect(
    dropzone(page).getByText("or paste with Ctrl+V / ⌘V")
  ).toBeVisible()
})

test("a pasted image appears in the file list and uploads", async ({
  page,
}) => {
  await dropzone(page).focus()
  const claimed = await pasteFiles(page, [screenshot])
  expect(claimed).toBe(true)

  await expect(items(page)).toHaveCount(1)
  const title = items(page).locator('[data-slot="upload-item-title"]')
  await expect(title).toHaveText(PASTED_NAME)
  await expect(items(page).first()).toHaveAttribute("data-status", "success")
  // Screen readers hear about it.
  await expect(
    page.locator('[data-slot="upload"] [role="status"][aria-live="polite"]')
  ).toHaveText(/pasted-image-.* uploaded|1 file added/)
})

test("a real Ctrl+V pastes a screenshot from the clipboard", async ({
  page,
}) => {
  await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    const blob = new Blob([bytes], { type: "image/png" })
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
  }, PNG_BASE64)

  await dropzone(page).focus()
  await page.keyboard.press("ControlOrMeta+V")

  await expect(items(page)).toHaveCount(1)
  // The browser calls a clipboard bitmap "image.png": it gets a real name.
  await expect(
    items(page).locator('[data-slot="upload-item-title"]')
  ).toHaveText(PASTED_NAME)
})

test("pastes several files at once", async ({ page }) => {
  await dropzone(page).focus()
  await pasteFiles(page, [
    { name: "first.png", type: "image/png", base64: PNG_BASE64 },
    { name: "second.png", type: "image/png", base64: PNG_BASE64 },
    screenshot,
  ])

  await expect(items(page)).toHaveCount(3)
  const titles = items(page).locator('[data-slot="upload-item-title"]')
  await expect(titles.nth(0)).toHaveText("first.png")
  await expect(titles.nth(1)).toHaveText("second.png")
  await expect(titles.nth(2)).toHaveText(PASTED_NAME)
})

test("validates pasted files like dropped ones", async ({ page }) => {
  await dropzone(page).focus()
  await pasteFiles(page, [
    { name: "notes.pdf", type: "application/pdf", base64: btoa("%PDF-1.4") },
  ])

  await expect(items(page)).toHaveCount(1)
  await expect(items(page).first()).toHaveAttribute("data-status", "rejected")
  await expect(items(page).first()).toContainText("File type not allowed")
})

test("takes a paste while hovered, ignores it otherwise", async ({ page }) => {
  // Neither focused nor hovered: the paste is left alone.
  await page.mouse.move(2, 2)
  expect(await pasteFiles(page, [screenshot])).toBe(false)
  await expect(items(page)).toHaveCount(0)

  await dropzone(page).hover()
  expect(await pasteFiles(page, [screenshot])).toBe(true)
  await expect(items(page)).toHaveCount(1)

  await page.mouse.move(2, 2)
  expect(await pasteFiles(page, [screenshot])).toBe(false)
  await expect(items(page)).toHaveCount(1)
})

test("never takes a paste aimed at a text field", async ({ page }) => {
  await page.evaluate(() => {
    const input = document.createElement("input")
    input.id = "probe-input"
    input.setAttribute("aria-label", "Probe input")
    const textarea = document.createElement("textarea")
    textarea.id = "probe-textarea"
    textarea.setAttribute("aria-label", "Probe textarea")
    document.querySelector("main")!.append(input, textarea)
  })
  // Hovering the dropzone would normally be enough to take the paste.
  await dropzone(page).hover()

  for (const id of ["probe-input", "probe-textarea"]) {
    await page.locator(`#${id}`).focus()
    expect(await pasteFiles(page, [screenshot]), id).toBe(false)
  }
  await expect(items(page)).toHaveCount(0)

  // Text typed and pasted into the field still lands in the field.
  await page.locator("#probe-input").fill("hello")
  await expect(page.locator("#probe-input")).toHaveValue("hello")
})

test("has no accessibility violations", async ({ page }) => {
  await dropzone(page).focus()
  await pasteFiles(page, [screenshot])
  await expect(items(page).first()).toHaveAttribute("data-status", "success")
  expect(
    await axeViolations(page, page.locator('[data-slot="upload"]'))
  ).toEqual([])
})

test.describe("opt-in", () => {
  test("components without paste leave the clipboard alone", async ({
    page,
  }) => {
    await page.goto("/view/basic-upload")
    await hydrated(page, '[data-slot="upload-dropzone"]')
    await expect(dropzone(page)).not.toHaveAttribute("data-paste")
    await expect(page.getByText("or paste with")).toBeHidden()

    await dropzone(page).focus()
    expect(await pasteFiles(page, [screenshot])).toBe(false)
    await expect(items(page)).toHaveCount(0)
  })

  test("UploadPaste adds paste to an animated block", async ({ page }) => {
    await page.goto("/view/upload-paste")
    await hydrated(page, '[data-slot="upload-dropzone"]')
    await expect(page.locator('[data-slot="upload"]')).toHaveAttribute(
      "data-paste",
      ""
    )
    await expect(page.getByText("Paste with Ctrl+V / ⌘V")).toBeVisible()

    await page.locator('[data-slot="upload"]').hover()
    expect(await pasteFiles(page, [screenshot])).toBe(true)
    await expect(page.locator("[data-status]").first()).toBeVisible()
    await expect(
      page.locator('[data-slot="upload"] [role="status"]').first()
    ).toHaveText(/pasted-image-.* uploaded|1 file added/)
  })
})
